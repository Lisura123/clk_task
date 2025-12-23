import React, { useState, useRef, useEffect } from 'react';
import { Send, AtSign } from 'lucide-react';

const CommentInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  participants = [], 
  replyingTo = null, 
  onCancelReply = null,
  placeholder = "Write a comment..."
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  const maxChars = 2000;
  const remainingChars = maxChars - value.length;

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    if (newValue.length <= maxChars) {
      onChange(newValue);
      setCursorPosition(newCursorPos);

      // Check for @ mention trigger
      const textBeforeCursor = newValue.substring(0, newCursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        
        // Check if we're still in a mention (no spaces after @)
        if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
          setMentionSearch(textAfterAt.toLowerCase());
          setMentionPosition(lastAtIndex);
          setShowMentions(true);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (participant) => {
    const beforeMention = value.substring(0, mentionPosition);
    const afterCursor = value.substring(cursorPosition);
    const newValue = `${beforeMention}@${participant.name} ${afterCursor}`;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionPosition + participant.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(mentionSearch)
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="relative">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 px-4 py-3 rounded-r-lg shadow-sm animate-in slide-in-from-left duration-200">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Replying to <span className="font-semibold">{replyingTo.name}</span>
            </span>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="relative bg-white rounded-xl border-2 border-gray-200 focus-within:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-4 pr-20 rounded-xl focus:outline-none resize-none min-h-[100px] max-h-[300px] text-gray-800 placeholder-gray-400"
          rows="3"
        />

        {/* Character count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            remainingChars < 20 
              ? 'bg-red-100 text-red-700' 
              : remainingChars < 100 
              ? 'bg-orange-100 text-orange-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {value.length}/{maxChars}
          </div>
        </div>

        {/* Mention autocomplete */}
        {showMentions && filteredParticipants.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-30 w-80 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="sticky top-0 p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 text-sm font-semibold text-blue-900 flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Mention someone
            </div>
            <div className="py-1">
              {filteredParticipants.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => insertMention(participant)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b last:border-b-0 transition-colors group"
                >
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.name} className="w-10 h-10 rounded-full ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all">
                      {participant.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{participant.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{participant.role}</div>
                  </div>
                  <AtSign className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all text-sm font-medium"
            title="Mention someone (type @)"
          >
            <AtSign className="w-5 h-5" />
            <span className="hidden sm:inline">Mention</span>
          </button>
          <span className="text-xs text-gray-400 hidden md:inline flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl</kbd>
            +
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Enter</kbd>
            to send
          </span>
        </div>

        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:shadow-none font-medium"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
