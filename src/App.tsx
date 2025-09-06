import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from 'react-beautiful-dnd';
import { Download, Plus, Trash2, AlertCircle, Edit3, X, Check, Eraser } from 'lucide-react';

interface StickyNote {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'orange' | 'blue';
  category: 'know' | 'want' | 'learned';
}

type AssessmentMode = 'pre' | 'post';

const MAX_NOTES = 32;
const STORAGE_KEY = 'kwl-board-data';

const formatDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const colorClasses = {
  yellow: 'bg-yellow-200 border-yellow-300 text-yellow-900',
  pink: 'bg-pink-200 border-pink-300 text-pink-900',
  orange: 'bg-orange-200 border-orange-300 text-orange-900',
  blue: 'bg-blue-200 border-blue-300 text-blue-900',
};

const colorLabels = {
  yellow: 'What I Know',
  pink: 'What I Want to Know',
  orange: 'What I Learned',
  blue: 'What I Learned (Alt)',
};

function App() {
  const [topicTitle, setTopicTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'pink' | 'orange' | 'blue'>('yellow');
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('pre');
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [showFullBoardModal, setShowFullBoardModal] = useState(false);
  const [showClearBoardModal, setShowClearBoardModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { topicTitle: savedTitle, notes: savedNotes } = JSON.parse(savedData);
        setTopicTitle(savedTitle || '');
        setNotes(savedNotes || []);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  useEffect(() => {
    const dataToSave = { topicTitle, notes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topicTitle, notes]);

  useEffect(() => {
    if (assessmentMode === 'pre' && (selectedColor === 'orange' || selectedColor === 'blue')) {
      setSelectedColor('yellow');
    } else if (assessmentMode === 'post' && (selectedColor === 'yellow' || selectedColor === 'pink')) {
      setSelectedColor('orange');
    }
  }, [assessmentMode, selectedColor]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const getVisibleNotes = () => {
    if (assessmentMode === 'pre') {
      return notes.filter(note => note.color === 'yellow' || note.color === 'pink');
    } else {
      return notes.filter(note => note.color === 'orange' || note.color === 'blue');
    }
  };

  const getAvailableColors = () => {
    if (assessmentMode === 'pre') {
      return ['yellow', 'pink'] as const;
    } else {
      return ['orange', 'blue'] as const;
    }
  };

  const isBoardFull = () => {
    return getVisibleNotes().length >= MAX_NOTES;
  };

  const addNote = () => {
    if (!noteText.trim()) {
      showToast('Please enter note text');
      return;
    }
    if (isBoardFull()) {
      setShowFullBoardModal(true);
      return;
    }
    const category = selectedColor === 'yellow' ? 'know' :
                     selectedColor === 'pink' ? 'want' : 'learned';
    const newNote: StickyNote = {
      id: Date.now().toString(),
      text: noteText.trim(),
      color: selectedColor,
      category,
    };
    setNotes(prev => {
        const visibleNotes = getVisibleNotes();
        const otherNotes = prev.filter(p => !visibleNotes.find(vn => vn.id === p.id));
        const updatedVisibleNotes = [...visibleNotes];
        const randomIndex = Math.floor(Math.random() * (updatedVisibleNotes.length + 1));
        updatedVisibleNotes.splice(randomIndex, 0, newNote);
        return [...otherNotes, ...updatedVisibleNotes];
    });
    setNoteText('');
    showToast('Note added successfully!');
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    showToast('Note deleted');
  };

  const startEditingNote = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId);
    setEditingText(currentText);
  };

  const saveEditedNote = () => {
    if (!editingText.trim()) {
      showToast('Note text cannot be empty');
      return;
    }
    setNotes(prev => prev.map(note =>
      note.id === editingNoteId
        ? { ...note, text: editingText.trim() }
        : note
    ));
    setEditingNoteId(null);
    setEditingText('');
    showToast('Note updated successfully!');
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const clearBoard = () => {
    const visibleNotes = getVisibleNotes();
    const visibleNoteIds = new Set(visibleNotes.map(note => note.id));
    setNotes(prev => prev.filter(note => !visibleNoteIds.has(note.id)));
    setShowClearBoardModal(false);
    showToast('Board cleared successfully!');
  };

  const downloadBoard = async () => {
    const boardElement = boardRef.current;
    if (!boardElement) return;
    const dateStamp = document.createElement('div');
    dateStamp.style.position = 'absolute';
    dateStamp.style.top = '10px';
    dateStamp.style.right = '10px';
    dateStamp.style.fontSize = '12px';
    dateStamp.style.color = '#FFFFFF';
    dateStamp.style.backgroundColor = '#000000';
    dateStamp.style.padding = '4px 8px';
    dateStamp.style.borderRadius = '4px';
    dateStamp.style.zIndex = '1000';
    dateStamp.textContent = formatDate();
    boardElement.appendChild(dateStamp);
    try {
        const canvas = await html2canvas(boardElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
        });
        const link = document.createElement('a');
        link.download = topicTitle
            ? `${topicTitle.replace(/[^a-z0-9]/gi, '_')}_KWL_Board.png`
            : 'KWL_Board.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Board downloaded successfully!');
        setShowFullBoardModal(false);
    } catch (error) {
        console.error('Error downloading board:', error);
        showToast('Error downloading board');
    } finally {
        boardElement.removeChild(dateStamp);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const visibleNotes = getVisibleNotes();
    const otherNotes = notes.filter(n => !visibleNotes.find(vn => vn.id === n.id));
    const reorderedVisibleNotes = Array.from(visibleNotes);
    const [removed] = reorderedVisibleNotes.splice(result.source.index, 1);
    reorderedVisibleNotes.splice(result.destination.index, 0, removed);
    setNotes([...otherNotes, ...reorderedVisibleNotes]);
  };

  return (
    <>
      {/* --- CHANGE 1: Replaced the simple animation with a fancier "drop and bounce" one --- */}
      <style>{`
        @keyframes drop-in {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.7);
          }
          60% {
            opacity: 1;
            transform: translateY(5px) scale(1.05);
          }
          80% {
            transform: translateY(-2px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        .note-drop-in {
          animation: drop-in 0.5s ease-in-out forwards;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 lg:py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">KWL Sticky Notes Board</h1>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button onClick={() => setShowClearBoardModal(true)} className="flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                  <Eraser size={16} /> Clear Current
                </button>
                <button onClick={downloadBoard} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Download size={16} /> Download PNG
                </button>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="w-full lg:w-80 bg-white shadow-lg border-b lg:border-b-0 lg:border-r border-gray-200 p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3">Assessment Mode</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="assessmentMode" value="pre" checked={assessmentMode === 'pre'} onChange={(e) => setAssessmentMode(e.target.value as AssessmentMode)} className="mr-3 text-blue-600" />
                  <span className="text-gray-700 text-sm lg:text-base">Pre-assessment</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="assessmentMode" value="post" checked={assessmentMode === 'post'} onChange={(e) => setAssessmentMode(e.target.value as AssessmentMode)} className="mr-3 text-blue-600" />
                  <span className="text-gray-700 text-sm lg:text-base">Post-assessment</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note text</label>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full h-20 lg:h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm" placeholder="Enter your note text here..." />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Note Color</h3>
              <div className="space-y-2">
                {getAvailableColors().map((color) => (
                  <label key={color} className="flex items-center cursor-pointer">
                    <input type="radio" name="color" value={color} checked={selectedColor === color} onChange={(e) => setSelectedColor(e.target.value as any)} className="mr-3 text-blue-600" />
                    <div className={`w-4 h-4 rounded border-2 mr-2 ${colorClasses[color]}`}></div>
                    <span className="text-gray-700 text-xs lg:text-sm">{colorLabels[color]}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={addNote} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm lg:text-base">
              <Plus size={18} /> Add Note
            </button>
            <div className="text-xs lg:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between">
                <span>Notes on board:</span>
                <span className="font-medium">{getVisibleNotes().length}/{MAX_NOTES}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Mode:</span>
                <span className="font-medium capitalize">{assessmentMode}-assessment</span>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 lg:p-6">
            <div ref={boardRef} className="bg-white rounded-lg shadow-lg p-4 lg:p-6 relative">
              <div className="mb-4 lg:mb-6">
                <input type="text" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} className="w-full text-lg lg:text-2xl font-bold text-center text-gray-800 border-b-2 border-gray-200 focus:border-blue-500 outline-none py-2 bg-transparent" placeholder="Enter Chapter or Topic Title" />
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="notes-grid">
                  {(provided: DroppableProvided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 min-h-[450px] p-4 bg-gray-50 rounded-lg">
                      {getVisibleNotes().map((note, index) => (
                        <Draggable key={note.id} draggableId={note.id} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                                 className={`
                                  {/* --- CHANGE 2: Updated the class name to use the new animation --- */}
                                  note-drop-in
                                  ${colorClasses[note.color]} h-32 p-2 rounded-lg border-2 shadow-lg cursor-move transform transition-all duration-200
                                  ${snapshot.isDragging ? 'rotate-3 scale-105 shadow-2xl z-10' : 'hover:shadow-xl'} relative group flex flex-col`}>
                              {editingNoteId === note.id ? (
                                  <div className="flex flex-col h-full">
                                      <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-1 bg-transparent border-none outline-none resize-none text-xs lg:text-sm p-0 mb-2" autoFocus />
                                      <div className="flex gap-1.5 justify-end">
                                          <button onClick={saveEditedNote} className="bg-green-500 text-white rounded-full p-1.5 hover:bg-green-600 transition-colors"><Check size={14} /></button>
                                          <button onClick={cancelEditing} className="bg-gray-500 text-white rounded-full p-1.5 hover:bg-gray-600 transition-colors"><X size={14} /></button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10">
                                          <button onClick={() => startEditingNote(note.id, note.text)} className="bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 transition-colors"><Edit3 size={14} /></button>
                                          <button onClick={() => deleteNote(note.id)} className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"><Trash2 size={14} /></button>
                                      </div>
                                      <p className="text-xs lg:text-sm flex-1 break-words leading-relaxed">{note.text}</p>
                                  </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </div>
        {showFullBoardModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-lg p-6 max-w-md w-full"><div className="flex items-center gap-3 mb-4"><AlertCircle className="text-orange-500" size={24} /><h3 className="text-lg font-semibold">Board Full!</h3></div><p className="text-gray-600 mb-6">The board is full! Download the current board to save your work, then clear it to add more notes.</p><div className="flex flex-col sm:flex-row gap-3"><button onClick={downloadBoard} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">Download Board</button><button onClick={clearBoard} className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">Clear Board</button><button onClick={() => setShowFullBoardModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Cancel</button></div></div></div>}
        {showClearBoardModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-lg p-6 max-w-md w-full"><div className="flex items-center gap-3 mb-4"><AlertCircle className="text-red-500" size={24} /><h3 className="text-lg font-semibold">Clear Board?</h3></div><p className="text-gray-600 mb-6">Are you sure you want to clear all notes from the current board? This action cannot be undone.</p><div className="flex flex-col sm:flex-row gap-3"><button onClick={clearBoard} className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Yes, Clear Current Notes</button><button onClick={() => setShowClearBoardModal(false)} className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button></div></div></div>}
        {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>}
      </div>
    </>
  );
}

export default App;