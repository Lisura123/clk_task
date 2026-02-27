import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Reply, Edit2, Trash2, Send, AtSign, Paperclip, MoreVertical, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/authStore';
import { useConfirm } from './ConfirmDialog';

const CommentThread = ({ comment, onReply, onEdit, onDelete, participants, level = 0 }) => {
  const { user } = useAuthStore();
  const confirmDialog = useConfirm();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);

  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner || user?.role === 'admin';

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  const handleSaveEdit = async () => {
    await onEdit(comment.id, editText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(comment.comment);
    setIsEditing(false);
  };

  // Parse @mentions and make them clickable
  const renderCommentText = (text) => {
    // First split by markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      // Add the link
      parts.push({ type: 'link', text: match[1], url: match[2] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // If no links found, just process the whole text for mentions
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts.map((part, partIdx) => {
      if (part.type === 'link') {
        return (
          <a
            key={partIdx}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium underline ${isMyComment ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
          >
            {part.text}
          </a>
        );
      } else {
        // Process mentions in text parts
        const mentionParts = part.content.split(/(@\w+)/g);
        return mentionParts.map((subPart, subIdx) => {
          if (subPart.startsWith('@')) {
            return (
              <span key={`${partIdx}-${subIdx}`} className={`font-semibold ${isMyComment ? 'text-blue-100 bg-blue-600 bg-opacity-30' : 'text-blue-600 bg-blue-50'} px-1.5 py-0.5 rounded cursor-pointer hover:underline`}>
                {subPart}
              </span>
            );
          }
          return <span key={`${partIdx}-${subIdx}`}>{subPart}</span>;
        });
      }
    });
  };

  // Check if this comment is from the current user
  const isMyComment = isOwner;

  return (
    <div className={`${level > 0 ? 'mt-3' : 'mt-4'} ${level > 0 ? (isMyComment ? 'ml-8 md:ml-16' : 'mr-8 md:mr-16') : ''} transition-all duration-200`}>
      <div className={`flex gap-2 md:gap-3 ${isMyComment ? 'flex-row-reverse' : 'flex-row'} items-end`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.avatar ? (
            <img 
              src={comment.avatar} 
              alt={comment.name} 
              className="w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-white shadow-sm" 
            />
          ) : (
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${isMyComment ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200' : 'bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-200'} flex items-center justify-center text-white font-semibold text-sm shadow-md ring-2 ring-white`}>
              {comment.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className={`flex-1 min-w-0 max-w-[85%] md:max-w-[75%] ${isMyComment ? 'items-end' : 'items-start'}`}>
          <div className={`${isMyComment ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200' : 'bg-white border border-gray-200 text-gray-800 shadow-gray-200'} rounded-2xl px-4 py-2.5 md:py-3 relative shadow-md hover:shadow-lg transition-shadow duration-200`}>
            {/* Header */}
            <div className={`flex items-center gap-2 mb-1.5 ${isMyComment ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className={`font-semibold text-sm ${isMyComment ? 'text-blue-100' : 'text-gray-900'}`}>
                {isMyComment ? 'You' : comment.name}
              </span>
              <span className={`text-xs ${isMyComment ? 'text-blue-200' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && (
                <span className={`text-xs italic ${isMyComment ? 'text-blue-200' : 'text-gray-400'}`}>
                  (edited)
                </span>
              )}
              
              {/* Actions Menu - Only show for own comments */}
              {canEdit && (
                <button
                  onClick={() => setShowActions(!showActions)}
                  className={`ml-auto p-1 rounded-full hover:bg-opacity-20 ${isMyComment ? 'hover:bg-white text-blue-100' : 'hover:bg-gray-100 text-gray-400'} transition-colors`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Actions Dropdown */}
            {showActions && canEdit && (
              <div className={`absolute ${isMyComment ? 'left-0' : 'right-0'} top-12 bg-white border rounded-xl shadow-xl py-1.5 z-20 w-36 animate-in fade-in slide-in-from-top-2 duration-200`}>
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 text-gray-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await confirmDialog.show({
                      title: 'Delete Comment',
                      message: 'Are you sure you want to delete this comment?',
                      confirmText: 'Delete',
                      cancelText: 'Cancel',
                      type: 'danger'
                    });
                    if (confirmed) {
                      onDelete(comment.id);
                    }
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}

            {/* Comment Text */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  rows="3"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words ${isMyComment ? 'text-white' : 'text-gray-700'}`}>
                {renderCommentText(comment.comment)}
              </p>
            )}

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {comment.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 text-sm hover:underline ${isMyComment ? 'text-blue-100' : 'text-blue-600'}`}
                  >
                    <Paperclip className="w-4 h-4" />
                    {attachment.file_name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button & Timestamp */}
          <div className={`mt-1 flex items-center gap-3 text-xs ${isMyComment ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={() => onReply(comment.id, comment.name)}
              className="text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
            <span className="text-gray-400">
              {new Date(comment.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  participants={participants}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
