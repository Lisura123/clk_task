import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, Play, Sparkles, Target, Users, ClipboardList, Calendar, Bell, Settings, BarChart3, Building2, UserPlus, FileText, Clock } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

// Role-based tour configurations
const tourSteps = {
  admin: [
    {
      id: 'welcome',
      title: 'Welcome, Administrator! 👋',
      description: 'As a Super Admin, you have full control over the entire task management system. Let\'s take a quick tour of your powerful capabilities.',
      icon: Sparkles,
      highlight: null,
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'This is your command center. View system-wide statistics, monitor team performance, and track task completion rates across all departments.',
      icon: BarChart3,
      highlight: '[data-tour="dashboard"]',
    },
    {
      id: 'tasks',
      title: 'Task Management',
      description: 'Create, assign, and manage tasks for any department. Set priorities, deadlines, and track progress in real-time.',
      icon: ClipboardList,
      highlight: '[data-tour="tasks"]',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Add new employees, manage roles, approve registrations, and oversee all user accounts in the system.',
      icon: Users,
      highlight: '[data-tour="users"]',
    },
    {
      id: 'departments',
      title: 'Department Management',
      description: 'Create and organize departments, assign department heads, and structure your organization effectively.',
      icon: Building2,
      highlight: '[data-tour="departments"]',
    },
    {
      id: 'attendance',
      title: 'Attendance & Reports',
      description: 'Monitor employee attendance, manage GPS-based check-ins, and generate comprehensive attendance reports.',
      icon: Clock,
      highlight: '[data-tour="attendance"]',
    },
    {
      id: 'notifications',
      title: 'Stay Informed',
      description: 'Receive notifications about task updates, leave requests, and system activities. Never miss an important update!',
      icon: Bell,
      highlight: '[data-tour="notifications"]',
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'You now know the basics. Explore the system and discover more features. You can restart this tour anytime from your profile settings.',
      icon: CheckCircle,
      highlight: null,
    },
  ],
  hod: [
    {
      id: 'welcome',
      title: 'Welcome, Department Head! 👋',
      description: 'As a Department Head, you manage your team\'s tasks and oversee department operations. Let\'s explore your management tools.',
      icon: Sparkles,
      highlight: null,
    },
    {
      id: 'dashboard',
      title: 'Department Dashboard',
      description: 'View your department\'s performance at a glance. Track task completion, monitor team progress, and identify bottlenecks.',
      icon: BarChart3,
      highlight: '[data-tour="dashboard"]',
    },
    {
      id: 'tasks',
      title: 'Task Assignment',
      description: 'Create tasks for your team members, set priorities and deadlines. Monitor progress and ensure timely completion.',
      icon: ClipboardList,
      highlight: '[data-tour="tasks"]',
    },
    {
      id: 'team',
      title: 'Team Management',
      description: 'View and manage your department\'s employees. Track individual performance and workload distribution.',
      icon: Users,
      highlight: '[data-tour="users"]',
    },
    {
      id: 'leaves',
      title: 'Leave Approvals',
      description: 'Review and approve leave requests from your team members. Manage time-off to maintain productivity.',
      icon: Calendar,
      highlight: '[data-tour="leaves"]',
    },
    {
      id: 'attendance',
      title: 'Team Attendance',
      description: 'Monitor your team\'s attendance, view check-in/check-out times, and track work hours.',
      icon: Clock,
      highlight: '[data-tour="attendance"]',
    },
    {
      id: 'complete',
      title: 'Ready to Lead! 🎉',
      description: 'You\'re now equipped to manage your department effectively. Restart this tour anytime from your profile.',
      icon: CheckCircle,
      highlight: null,
    },
  ],
  senior_employee: [
    {
      id: 'welcome',
      title: 'Welcome, Senior Employee! 👋',
      description: 'As a Senior Employee, you have additional responsibilities including task oversight. Let\'s show you around.',
      icon: Sparkles,
      highlight: null,
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'View your tasks overview, upcoming deadlines, and track your productivity metrics all in one place.',
      icon: BarChart3,
      highlight: '[data-tour="dashboard"]',
    },
    {
      id: 'my-tasks',
      title: 'My Tasks',
      description: 'Access all tasks assigned to you. Update progress, add comments, and mark tasks as complete.',
      icon: ClipboardList,
      highlight: '[data-tour="my-tasks"]',
    },
    {
      id: 'all-tasks',
      title: 'All Department Tasks',
      description: 'As a senior employee, you can view and assist with all tasks in your department.',
      icon: Target,
      highlight: '[data-tour="tasks"]',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Check in and out using GPS attendance. View your attendance history and work hours.',
      icon: Clock,
      highlight: '[data-tour="attendance"]',
    },
    {
      id: 'leaves',
      title: 'Leave Management',
      description: 'Apply for leaves, track your leave balance, and view your leave history.',
      icon: Calendar,
      highlight: '[data-tour="my-leaves"]',
    },
    {
      id: 'complete',
      title: 'You\'re Ready! 🎉',
      description: 'Start working on your tasks and make an impact. Restart this tour from your profile anytime.',
      icon: CheckCircle,
      highlight: null,
    },
  ],
  employee: [
    {
      id: 'welcome',
      title: 'Welcome to CLK Task Management! 👋',
      description: 'We\'re excited to have you on board! Let\'s take a quick tour to help you get started.',
      icon: Sparkles,
      highlight: null,
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'This is your home base. See your tasks at a glance, check upcoming deadlines, and track your progress.',
      icon: BarChart3,
      highlight: '[data-tour="dashboard"]',
    },
    {
      id: 'my-tasks',
      title: 'My Tasks',
      description: 'View all tasks assigned to you here. Click on any task to see details, update progress, or add comments.',
      icon: ClipboardList,
      highlight: '[data-tour="my-tasks"]',
    },
    {
      id: 'task-progress',
      title: 'Update Progress',
      description: 'When working on a task, use the progress slider to update your completion percentage. The status updates automatically!',
      icon: Target,
      highlight: null,
    },
    {
      id: 'attendance',
      title: 'Mark Attendance',
      description: 'Use GPS attendance to check in when you arrive and check out when you leave. Keep your attendance record accurate.',
      icon: Clock,
      highlight: '[data-tour="attendance"]',
    },
    {
      id: 'leaves',
      title: 'Apply for Leave',
      description: 'Need time off? Apply for leave here. Your supervisor will be notified and can approve your request.',
      icon: Calendar,
      highlight: '[data-tour="my-leaves"]',
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'Check notifications for new task assignments, comments, and important updates from your team.',
      icon: Bell,
      highlight: '[data-tour="notifications"]',
    },
    {
      id: 'complete',
      title: 'All Set! 🎉',
      description: 'You\'re ready to start working! If you need this tour again, you can restart it from your profile page.',
      icon: CheckCircle,
      highlight: null,
    },
  ],
};

const OnboardingTour = ({ onComplete }) => {
  const { user, updateUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get steps based on user role
  const steps = tourSteps[user?.role] || tourSteps.employee;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    setIsVisible(false);
    onComplete?.();
  };

  const handleComplete = async () => {
    await markOnboardingComplete();
    setIsVisible(false);
    onComplete?.();
  };

  const markOnboardingComplete = async () => {
    try {
      await api.post('/users/onboarding-complete');
      updateUser({ onboarding_completed: true });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      // Still update locally even if API fails
      updateUser({ onboarding_completed: true });
      localStorage.setItem('onboarding_completed', 'true');
    }
  };

  // Highlight element if specified
  useEffect(() => {
    const step = steps[currentStep];
    if (step?.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        element.classList.add('tour-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return () => {
        if (element) {
          element.classList.remove('tour-highlight');
        }
      };
    }
  }, [currentStep, steps]);

  if (!isVisible) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300" />
      
      {/* Tour Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div 
          className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-300 ${
            isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="relative bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-white">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <StepIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-red-100 text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h2 className="text-2xl font-bold">{step.title}</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-gray-600 text-lg leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Skip Tour
            </button>
            
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-1 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Get Started
                    <CheckCircle className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="px-6 pb-4 flex justify-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-red-600' 
                    : index < currentStep 
                      ? 'bg-red-300' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS for highlighting elements */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9997;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.3);
          border-radius: 8px;
          animation: pulse-highlight 2s infinite;
        }
        
        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.3), 0 0 30px rgba(220, 38, 38, 0.2);
          }
        }
      `}</style>
    </>
  );
};

export default OnboardingTour;
