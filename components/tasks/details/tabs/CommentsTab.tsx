import React, { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, MoreHorizontal, Smile } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useSession } from 'next-auth/react';

interface CommentsTabProps {
  comments: any[];
  setComments: (comments: any[]) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
}

export function CommentsTab({ comments, setComments, newComment, setNewComment }: CommentsTabProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: session } = useSession();
  const userName = session?.user?.name || 'Unknown User';
  const userInitials = userName.substring(0, 2).toUpperCase();

  const handleAddComment = () => {
    if (!newComment.trim() || newComment === '<p></p>') return;
    const comment = {
      id: Date.now().toString(),
      user: { name: userName, initials: userInitials, color: 'bg-green-100 text-green-700' },
      content: newComment,
      timestamp: new Date(),
    };
    setComments([...comments, comment]);
    setNewComment('');
    setIsExpanded(false);
    toast.success('Comment added successfully');
  };

  const handleDelete = (id: string) => {
    setComments(comments.filter(c => c.id !== id));
    setDeleteConfirmId(null);
    toast.success('Comment deleted');
  };

  const startEdit = (comment: any) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const saveEdit = (id: string) => {
    if (!editContent.trim() || editContent === '<p></p>') return;
    setComments(comments.map(c => c.id === id ? { ...c, content: editContent } : c));
    setEditingId(null);
    toast.success('Comment updated successfully');
  };



  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
        <MessageSquare className="w-5 h-5 text-gray-500" />
        <h3>Discussion</h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        {comments.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            No comments yet. Be the first to start the discussion!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-4">
              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm ${comment.user.color}`}>
                {comment.user.initials}
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm text-gray-900">{comment.user.name}</span>
                    <span className="text-xs text-gray-500">{format(comment.timestamp, 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex space-x-3 text-xs font-medium text-gray-500">
                    <button onClick={() => startEdit(comment)} className="hover:text-blue-600">Edit</button>
                    <button onClick={() => setDeleteConfirmId(comment.id)} className="hover:text-red-600">Delete</button>
                  </div>
                </div>
                {editingId === comment.id ? (
                  <div className="p-4 space-y-3">
                    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white shadow-sm">
                      <RichTextEditor 
                        value={editContent} 
                        onChange={setEditContent} 
                        className="border-none rounded-none shadow-none focus-within:ring-0 focus-within:border-transparent min-h-[100px]"
                      />
                    </div>
                    <div className="flex space-x-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white border-transparent" size="sm" onClick={() => saveEdit(comment.id)} disabled={!editContent || editContent === '<p></p>' || editContent === comment.content}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Area */}
      <div className="mt-auto border-t pt-4">
        <div className="flex space-x-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center font-semibold text-sm text-green-700">
            {userInitials}
          </div>
          <div className="flex-1">
            {!isExpanded ? (
              <div 
                className="border border-gray-300 rounded-lg overflow-hidden bg-white px-4 py-2.5 text-sm text-gray-500 cursor-text hover:border-gray-400 transition-colors"
                onClick={() => setIsExpanded(true)}
              >
                Type @ to mention someone and #I to mention item ID
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white shadow-sm transition-shadow">
                
                <RichTextEditor 
                  value={newComment} 
                  onChange={setNewComment} 
                  placeholder="Add a comment... (Markdown supported)"
                  className="border-none rounded-none shadow-none focus-within:ring-0 focus-within:border-transparent"
                />

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-end border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Button type="button" className="bg-green-600 hover:bg-green-700 text-white border-transparent" size="sm" onClick={handleAddComment} disabled={!newComment || newComment === '<p></p>'}>
                      Add
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setNewComment(''); setIsExpanded(false); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Comment</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button type="button" className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => handleDelete(deleteConfirmId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
