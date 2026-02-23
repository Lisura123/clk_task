<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class WebPushController extends Controller
{
    /**
     * Get the VAPID public key for client subscription
     */
    public function getPublicKey()
    {
        return response()->json([
            'publicKey' => config('services.webpush.public_key')
        ]);
    }

    /**
     * Store a push subscription
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $user = Auth::user();

        // Delete existing subscription with same endpoint
        PushSubscription::where('endpoint', $request->endpoint)->delete();

        // Create new subscription
        $subscription = PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => $request->endpoint,
            'p256dh_key' => $request->input('keys.p256dh'),
            'auth_key' => $request->input('keys.auth'),
            'content_encoding' => $request->input('contentEncoding', 'aesgcm'),
        ]);

        return response()->json([
            'message' => 'Subscription saved successfully',
            'subscription' => $subscription
        ], 201);
    }

    /**
     * Remove a push subscription
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        PushSubscription::where('user_id', Auth::id())
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json([
            'message' => 'Unsubscribed successfully'
        ]);
    }

    /**
     * Send a push notification to a specific user
     */
    public static function sendToUser(int $userId, array $payload): array
    {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();
        
        if ($subscriptions->isEmpty()) {
            return ['success' => false, 'message' => 'No subscriptions found'];
        }

        $auth = [
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ];

        $webPush = new WebPush($auth);

        $results = [];
        foreach ($subscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'publicKey' => $sub->p256dh_key,
                'authToken' => $sub->auth_key,
                'contentEncoding' => $sub->content_encoding,
            ]);

            $webPush->queueNotification(
                $subscription,
                json_encode($payload)
            );
        }

        // Send all queued notifications
        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            
            if ($report->isSuccess()) {
                $results[] = ['endpoint' => $endpoint, 'success' => true];
            } else {
                $results[] = ['endpoint' => $endpoint, 'success' => false, 'reason' => $report->getReason()];
                
                // Remove invalid subscriptions
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $endpoint)->delete();
                }
            }
        }

        return ['success' => true, 'results' => $results];
    }

    /**
     * Test push notification (for debugging)
     */
    public function test(Request $request)
    {
        $user = Auth::user();
        
        $result = self::sendToUser($user->id, [
            'title' => 'Test Notification',
            'body' => 'Push notifications are working!',
            'icon' => '/favicon.svg',
            'tag' => 'test-' . time(),
            'data' => [
                'url' => '/dashboard'
            ]
        ]);

        return response()->json($result);
    }
}
