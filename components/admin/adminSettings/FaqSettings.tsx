"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebaseConfig';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, doc, updateDoc, deleteDoc, setDoc, writeBatch 
} from 'firebase/firestore';
import { 
  FaPlus, FaTrash, FaEdit, FaSave, FaSpinner, 
  FaExclamationTriangle, FaChevronDown, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function FaqEditorUi() {
  // Refs for scrolling
  const categoryInputRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLDivElement>(null);

  // FAQ Data
  const [faqSubtitle, setFaqSubtitle] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // UI States
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  
  const [newQuestion, setNewQuestion] = useState({ q: '', a: '', categoryId: '', link: '', linkText: '' });
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<{id: string, type: string, name: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "faq"), (snap) => {
      if (snap.exists()) setFaqSubtitle(snap.data().subtitle || '');
    });

    const unsubCategories = onSnapshot(
      query(collection(db, "faq_categories"), orderBy("order", "asc")),
      (snap) => setCategories(snap.docs.map(d => ({id: d.id, ...d.data()})))
    );

    const unsubQuestions = onSnapshot(
      query(collection(db, "faq_questions"), orderBy("order", "asc")),
      (snap) => setQuestions(snap.docs.map(d => ({id: d.id, ...d.data()})))
    );

    return () => { unsubSettings(); unsubCategories(); unsubQuestions(); };
  }, []);

  const saveSubtitle = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "faq"), { subtitle: faqSubtitle, updatedAt: serverTimestamp() });
      toast.success("FAQ subtitle saved");
    } catch (e) { toast.error("Error saving"); }
    finally { setLoading(false); }
  };

  const addCategory = async () => {
    if (!newCategory) return toast.error("Enter category name");
    try {
      await addDoc(collection(db, "faq_categories"), {
        name: newCategory, order: categories.length, createdAt: serverTimestamp()
      });
      setNewCategory('');
      toast.success("Category added");
    } catch (e) { toast.error("Error adding category"); }
  };

  const updateCategory = async () => {
    if (!editingCategory || !newCategory) return;
    try {
      await updateDoc(doc(db, "faq_categories", editingCategory), { name: newCategory });
      setEditingCategory(null); setNewCategory('');
      toast.success("Category updated");
    } catch (e) { toast.error("Error updating"); }
  };

  const startEditCategory = (cat: any) => {
    setEditingCategory(cat.id);
    setNewCategory(cat.name);
    categoryInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) return;
    
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const currentCat = categories[index];
    const swapCat = categories[swapIndex];

    // Optimistic UI update (Optional but makes it feel faster)
    const newCategories = [...categories];
    newCategories[index] = { ...swapCat, order: currentCat.order };
    newCategories[swapIndex] = { ...currentCat, order: swapCat.order };
    setCategories(newCategories.sort((a, b) => a.order - b.order));

    const batch = writeBatch(db);
    
    // We use the literal order values from the documents to ensure they swap places
    const currentRef = doc(db, "faq_categories", currentCat.id);
    const swapRef = doc(db, "faq_categories", swapCat.id);

    batch.update(currentRef, { order: swapCat.order });
    batch.update(swapRef, { order: currentCat.order });
    
    try {
      await batch.commit();
    } catch (e) { 
      toast.error("Error moving category");
      // Revert is handled by the onSnapshot listener automatically
    }
  };

  const moveQuestion = async (id: string, categoryId: string, direction: 'up' | 'down') => {
    const catQuestions = questions
      .filter(q => q.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);

    const index = catQuestions.findIndex(q => q.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === catQuestions.length - 1)) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const currentQ = catQuestions[index];
    const swapQ = catQuestions[swapIndex];

    const batch = writeBatch(db);
    batch.update(doc(db, "faq_questions", currentQ.id), { order: swapQ.order });
    batch.update(doc(db, "faq_questions", swapQ.id), { order: currentQ.order });

    try {
      await batch.commit();
    } catch (e) { toast.error("Error moving question"); }
  };

  const addQuestion = async () => {
    if (!newQuestion.q || !newQuestion.a || !newQuestion.categoryId) return toast.error("Fill all fields");
    try {
      const catQuestions = questions.filter(q => q.categoryId === newQuestion.categoryId);
      await addDoc(collection(db, "faq_questions"), { 
        ...newQuestion, 
        order: catQuestions.length, 
        createdAt: serverTimestamp() 
      });
      setNewQuestion({ q: '', a: '', categoryId: '', link: '', linkText: '' });
      toast.success("Question added");
    } catch (e) { toast.error("Error adding question"); }
  };

  const updateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      await updateDoc(doc(db, "faq_questions", editingQuestion), newQuestion);
      setEditingQuestion(null);
      setNewQuestion({ q: '', a: '', categoryId: '', link: '', linkText: '' });
      toast.success("Question updated");
    } catch (e) { toast.error("Error updating"); }
  };

  const startEditQuestion = (question: any) => {
    setEditingQuestion(question.id);
    setNewQuestion({ 
      q: question.q, 
      a: question.a, 
      categoryId: question.categoryId, 
      link: question.link || '', 
      linkText: question.linkText || '' 
    });
    questionInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, deleteTarget.type === 'category' ? 'faq_categories' : 'faq_questions', deleteTarget.id));
      toast.success(`${deleteTarget.type === 'category' ? 'Category' : 'Question'} deleted`);
      setDeleteTarget(null);
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <div className="min-h-screen bg-white p-1 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
            FAQ <span className="text-orange-600">Editor</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">Manage all frequently asked questions and categories</p>
        </header>

        {/* Delete Modal Overlay */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white max-w-sm w-full p-8 rounded-xl text-center shadow-xl">
                <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
                <h3 className="font-black uppercase italic mb-2 text-slate-900">Delete {deleteTarget.type}?</h3>
                <p className="text-sm text-slate-500 mb-4 italic">"{deleteTarget.name}"</p>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                  <button onClick={executeDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase text-[10px]">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtitle Section */}
        <section className="bg-white border border-slate-200 md:rounded-xl shadow-sm p-4 md:p-6 mb-10">
          <h2 className="text-xl font-black uppercase mb-4 text-slate-900">FAQ Subtitle</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input value={faqSubtitle} onChange={(e) => setFaqSubtitle(e.target.value)} placeholder="Subtitle..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-orange-500 text-slate-800" />
            <button onClick={saveSubtitle} disabled={loading} className="py-3 px-6 bg-green-600 text-white rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-green-700 transition-colors">
              {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Save
            </button>
          </div>
        </section>

        {/* Categories Section */}
        <section className="bg-white border border-slate-200 md:rounded-xl shadow-sm py-3 md:p-6 mb-10">
          <h2 className="p-3 md:p-0 text-xl font-black uppercase mb-6 text-slate-900">Categories</h2>
          <div ref={categoryInputRef} className="flex flex-col md:flex-row gap-4 mb-6 p-3 md:p-0">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-orange-500 text-slate-800"
            />
            <button 
              onClick={editingCategory ? updateCategory : addCategory} 
              className={`py-3 px-6 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors ${editingCategory ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
            >
              {editingCategory ? <FaSave /> : <FaPlus />} {editingCategory ? 'Update' : 'Add'}
            </button>
            {editingCategory && (
                <button onClick={() => {setEditingCategory(null); setNewCategory('');}} className="text-xs uppercase font-bold text-slate-400 underline">Cancel</button>
            )}
          </div>

          <div className="space-y-2">
            {categories.map((cat, index) => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="font-bold text-orange-600 w-8 text-center">{index + 1}</span>
                  <span className="font-bold text-slate-800">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveCategory(cat.id, 'up')} disabled={index === 0} className="p-2 text-slate-500 hover:text-orange-600 disabled:opacity-30"><FaArrowUp size={12} /></button>
                  <button onClick={() => moveCategory(cat.id, 'down')} disabled={index === categories.length-1} className="p-2 text-slate-500 hover:text-orange-600 disabled:opacity-30"><FaArrowDown size={12} /></button>
                  <button onClick={() => startEditCategory(cat)} className="p-2 text-blue-600 hover:text-blue-800"><FaEdit size={12} /></button>
                  <button onClick={() => setDeleteTarget({id: cat.id, type: 'category', name: cat.name})} className="p-2 text-red-600 hover:text-red-800"><FaTrash size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Questions Section */}
        <section className="bg-white border border-slate-200 md:rounded-xl shadow-sm p-3 md:p-6 mb-10">
          <h2 className="text-center md:text-left text-xl font-black uppercase mb-6 text-slate-900">Questions & Answers</h2>
          <div ref={questionInputRef} className="grid gap-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <select
              value={newQuestion.categoryId}
              onChange={(e) => setNewQuestion({...newQuestion, categoryId: e.target.value})}
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-orange-500 text-slate-800"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input value={newQuestion.q} onChange={(e) => setNewQuestion({...newQuestion, q: e.target.value})} placeholder="Question" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-orange-500 text-slate-800" />
            <textarea value={newQuestion.a} onChange={(e) => setNewQuestion({...newQuestion, a: e.target.value})} placeholder="Answer" rows={3} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-orange-500 text-slate-800" />
            <div className="flex gap-4">
                <button onClick={editingQuestion ? updateQuestion : addQuestion} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${editingQuestion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>
                {editingQuestion ? <FaSave /> : <FaPlus />} {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
                {editingQuestion && (
                    <button onClick={() => {setEditingQuestion(null); setNewQuestion({ q: '', a: '', categoryId: '', link: '', linkText: '' });}} className="px-4 py-3 bg-slate-200 rounded-lg text-slate-600 font-bold uppercase text-[10px]">Cancel</button>
                )}
            </div>
          </div>

          <div className="space-y-4">
            {categories.map(cat => {
              const catQuestions = questions.filter(q => q.categoryId === cat.id).sort((a, b) => a.order - b.order);
              if (catQuestions.length === 0) return null;
              return (
                <div key={cat.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)} className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 transition-colors">
                    <h3 className="font-bold text-base md:text-lg text-slate-800">{cat.name} <span className="text-sm text-slate-500 ml-2">({catQuestions.length})</span></h3>
                    <FaChevronDown className={`text-slate-500 transition-transform ${expandedCategory === cat.id ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedCategory === cat.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="divide-y divide-slate-100 bg-white">
                        {catQuestions.map((q, index) => (
                          <div key={q.id} className="p-2 md:p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 md:gap-4">
                                <span className="text-xs font-bold text-slate-400 w-6">{index + 1}</span>
                                <h4 className="font-bold text-sm text-slate-800">{q.q}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => moveQuestion(q.id, cat.id, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-orange-600 disabled:opacity-20"><FaArrowUp size={10} /></button>
                                <button onClick={() => moveQuestion(q.id, cat.id, 'down')} disabled={index === catQuestions.length - 1} className="p-1 text-slate-400 hover:text-orange-600 disabled:opacity-20"><FaArrowDown size={10} /></button>
                                <button onClick={() => startEditQuestion(q)} className="p-1 text-blue-600 hover:text-blue-800"><FaEdit size={12} /></button>
                                <button onClick={() => setDeleteTarget({id: q.id, type: 'question', name: q.q})} className="p-1 text-red-600 hover:text-red-800"><FaTrash size={12} /></button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 pl-3 md:pl-10 leading-relaxed">{q.a}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}