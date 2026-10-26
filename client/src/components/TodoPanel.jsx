import { useState, useEffect } from 'react'
import { CheckSquare, Plus, Trash2, Edit, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react'
import api from '../api/axios'
import { Modal } from './UI'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const PRIORITIES = ['High', 'Normal', 'Low']
const EMPTY = { title: '', dueDate: '', priority: 'Normal', assignedTo: '', notes: '' }

const pad = n => String(n).padStart(2, '0')
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function DueTag({ dueDate, done }) {
  if (!dueDate) return null
  const due = dueDate.slice(0, 10)
  const today = todayKey()
  if (!done && due < today) return <span className="badge bg-red-50 text-red-700">Overdue · {formatDate(dueDate)}</span>
  if (!done && due === today) return <span className="badge bg-amber-50 text-amber-700">Due today</span>
  return <span className="text-xs text-gray-500">Due {formatDate(dueDate)}</span>
}

// Title, due date, priority, assignee and notes; used for both quick-add options and edit
function TodoFields({ form, setForm, assignees, showTitle = true, showNotes = false }) {
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  return (
    <div className="space-y-3">
      {showTitle && (
        <div>
          <label className="label">Task *</label>
          <input type="text" value={form.title} onChange={set('title')} className="input" required maxLength={300} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Due Date</label>
          <input type="date" value={form.dueDate} onChange={set('dueDate')} className="input" />
        </div>
        <div>
          <label className="label">Priority</label>
          <select value={form.priority} onChange={set('priority')} className="input">
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Assign To</label>
          <select value={form.assignedTo} onChange={set('assignedTo')} className="input">
            <option value="">Nobody (my task)</option>
            {assignees.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
      </div>
      {showNotes && (
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} maxLength={1000} />
        </div>
      )}
    </div>
  )
}

export default function TodoPanel() {
  const [todos, setTodos] = useState({ open: [], done: [], doneCount: 0 })
  const [assignees, setAssignees] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [showOptions, setShowOptions] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState(null) // { id, form }

  const load = () => api.get('/todos')
    .then(r => setTodos(r.data.data))
    .catch(() => toast.error('Failed to load to-do list'))
    .finally(() => setLoading(false))

  useEffect(() => {
    load()
    api.get('/todos/assignees').then(r => setAssignees(r.data.data)).catch(() => {})
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setAdding(true)
    try {
      await api.post('/todos', form)
      setForm(EMPTY)
      setShowOptions(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task')
    } finally {
      setAdding(false)
    }
  }

  const toggleDone = async (todo) => {
    // Move it between lists straight away; reload puts it in its sorted place
    setTodos(t => todo.done
      ? { open: [...t.open, { ...todo, done: false }], done: t.done.filter(x => x._id !== todo._id), doneCount: t.doneCount - 1 }
      : { open: t.open.filter(x => x._id !== todo._id), done: [{ ...todo, done: true }, ...t.done], doneCount: t.doneCount + 1 })
    try {
      await api.put(`/todos/${todo._id}`, { done: !todo.done })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task')
    }
    load()
  }

  const handleDelete = async (todo) => {
    try {
      await api.delete(`/todos/${todo._id}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task')
    }
  }

  const clearCompleted = async () => {
    try {
      const r = await api.delete('/todos/completed')
      toast.success(`${r.data.data.deleted} completed task(s) cleared`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear tasks')
    }
  }

  const startEdit = (todo) => setEditing({
    id: todo._id,
    form: {
      title: todo.title,
      dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '',
      priority: todo.priority,
      assignedTo: todo.assignedTo?._id || '',
      notes: todo.notes || '',
    },
  })

  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/todos/${editing.id}`, editing.form)
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task')
    }
  }

  const renderTodo = (todo) => {
    const assignee = todo.assignedTo?.name
    const fromOther = !todo.canDelete && todo.createdBy?.name
    return (
      <li key={todo._id} className="group flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50">
        <input type="checkbox" checked={todo.done} onChange={() => toggleDone(todo)}
          className="mt-0.5 w-4 h-4 accent-forest-600 cursor-pointer flex-shrink-0" aria-label={`Mark "${todo.title}" ${todo.done ? 'not done' : 'done'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm break-words ${todo.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {todo.priority === 'High' && !todo.done && <span className="text-red-600 font-bold mr-1" title="High priority">!</span>}
            {todo.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-gray-500">
            <DueTag dueDate={todo.dueDate} done={todo.done} />
            {assignee && <span>→ {assignee}</span>}
            {fromOther && <span>from {fromOther}</span>}
            {todo.done && todo.doneByName && <span>done by {todo.doneByName}</span>}
            {todo.notes && <span className="truncate max-w-[200px]" title={todo.notes}>· {todo.notes}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          {!todo.done && (
            <button onClick={() => startEdit(todo)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Edit task"><Edit size={14} /></button>
          )}
          {todo.canDelete && (
            <button onClick={() => handleDelete(todo)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete task"><Trash2 size={14} /></button>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CheckSquare size={17} className="text-forest-600" /> To-Do
          {todos.open.length > 0 && <span className="badge bg-forest-50 text-forest-700">{todos.open.length}</span>}
        </h2>
      </div>

      <form onSubmit={handleAdd} className="px-5 py-3 border-b border-gray-100 space-y-3">
        <div className="flex gap-2">
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Add a task and press Enter" className="input flex-1" maxLength={300} />
          <button type="button" onClick={() => setShowOptions(s => !s)} aria-label="More options"
            className={`btn-secondary px-2.5 ${showOptions ? 'bg-gray-100' : ''}`}><SlidersHorizontal size={15} /></button>
          <button type="submit" disabled={adding || !form.title.trim()} className="btn-primary px-3 disabled:opacity-50" aria-label="Add task">
            <Plus size={15} />
          </button>
        </div>
        {showOptions && <TodoFields form={form} setForm={setForm} assignees={assignees} showTitle={false} />}
      </form>

      <div className="flex-1">
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Loading...</p>
        ) : todos.open.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Nothing to do. Add a task above.</p>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">{todos.open.map(renderTodo)}</ul>
        )}
      </div>

      {todos.doneCount > 0 && (
        <div className="border-t border-gray-100">
          <div className="flex items-center justify-between px-5 py-2.5">
            <button onClick={() => setShowDone(s => !s)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
              {showDone ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Completed ({todos.doneCount})
            </button>
            {showDone && todos.done.some(t => t.canDelete) && (
              <button onClick={clearCompleted} className="text-xs text-gray-400 hover:text-red-600">Clear my completed</button>
            )}
          </div>
          {showDone && <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto pb-2">{todos.done.map(renderTodo)}</ul>}
        </div>
      )}

      <Modal open={Boolean(editing)} title="Edit Task" onClose={() => setEditing(null)} size="lg">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <TodoFields form={editing.form} assignees={assignees} showNotes
              setForm={updater => setEditing(ed => ({ ...ed, form: updater(ed.form) }))} />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
