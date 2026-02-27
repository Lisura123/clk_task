import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Edit2, 
  Trash2, 
  X, 
  Reply,
  MoreVertical,
  User,
  Check,
  MessageCircle
} from 'lucide-react';
import { groupMessageAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

export default function GroupChat({ group, onClose }) {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await groupMessageAPI.getMessages(group.id, { per_page: 100 });
      // Reverse to show oldest first
      setMessages((response.data.data || []).reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const data = {
        message: newMessage.trim(),
        reply_to_id: replyingTo?.id || null,
      };
      
      const response = await groupMessageAPI.sendMessage(group.id, data);
      setMessages(prev => [...prev, response.data.data]);
      setNewMessage('');
      setReplyingTo(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;

    try {
      const response = await groupMessageAPI.updateMessage(group.id, messageId, {
        message: editText.trim(),
      });
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? response.data.data : msg)
      );
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await groupMessageAPI.deleteMessage(group.id, messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const startEdit = (message) => {
    setEditingMessage(message.id);
    setEditText(message.message);
    setShowMenu(null);
  };

  const startReply = (message) => {
    setReplyingTo(message);
    setShowMenu(null);
    inputRef.current?.focus();
  };

  const canModifyMessage = (message) => {
    return message.user_id === user?.id || 
           user?.role === 'admin' || 
           (user?.role === 'hod' && group.created_by === user?.id);
  };

  const canEditMessage = (message) => {
    return message.user_id === user?.id;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Admin</span>;
      case 'hod':
        return <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">HOD</span>;
      case 'senior_employee':
        return <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Senior</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold">{group.name}</h2>
              <p className="text-sm text-gray-500">
                {group.members?.length || 0} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.user_id === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : ''}`}>
                    {/* Reply preview */}
                    {message.reply_to && (
                      <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs bg-gray-100 border-l-2 border-gray-400 ${isOwnMessage ? 'ml-auto' : ''}`}>
                        <span className="font-medium text-gray-600">
                          {message.reply_to.user?.name || 'Unknown'}
                        </span>
                        <p className="text-gray-500 truncate">{message.reply_to.message}</p>
                      </div>
                    )}
                    
                    <div
                      className={`group relative rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {/* User name for others' messages */}
                      {!isOwnMessage && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {message.user?.name || 'Unknown'}
                          </span>
                          {getRoleBadge(message.user?.role)}
                        </div>
                      )}
                      
                      {/* Message content */}
                      {editingMessage === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-900 text-sm resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingMessage(null)}
                              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditMessage(message.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                            <span>{formatTime(message.created_at)}</span>
                            {message.is_edited && <span>(edited)</span>}
                          </div>
                        </>
                      )}
                      
                      {/* Message actions */}
                      {editingMessage !== message.id && (
                        <div className={`absolute top-1 ${isOwnMessage ? 'left-0 -translate-x-full pl-1' : 'right-0 translate-x-full pr-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <div className="relative">
                            <button
                              onClick={() => setShowMenu(showMenu === message.id ? null : message.id)}
                              className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {showMenu === message.id && (
                              <div className={`absolute z-10 mt-1 w-32 bg-white rounded-lg shadow-lg border py-1 ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                                <button
                                  onClick={() => startReply(message)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Reply className="w-4 h-4" />
                                  Reply
                                </button>
                                {canEditMessage(message) && (
                                  <button
                                    onClick={() => startEdit(message)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </button>
                                )}
                                {canModifyMessage(message) && (
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Replying to</span>
              <span className="font-medium">{replyingTo.user?.name}</span>
              <span className="text-gray-400 truncate max-w-[200px]">{replyingTo.message}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
