'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  FolderOpen,
  MoreVertical,
  Play,
  Clock,
  FileText,
  Trash2,
  Edit,
  Copy,
  Download,
  Star,
  StarOff,
  Grid,
  List
} from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  duration?: number
  wordCount?: number
  voiceCount?: number
  status: 'draft' | 'in_progress' | 'completed'
  isFavorite?: boolean
  thumbnail?: string
}

const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'Product Introduction Video',
    description: 'Narration for the Q1 product launch video',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    duration: 180,
    wordCount: 450,
    voiceCount: 2,
    status: 'completed',
    isFavorite: true
  },
  {
    id: '2',
    name: 'Audiobook Chapter 1',
    description: 'First chapter of "The Journey Begins"',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    duration: 1800,
    wordCount: 4500,
    voiceCount: 3,
    status: 'in_progress'
  },
  {
    id: '3',
    name: 'Training Module Narration',
    description: 'Employee onboarding training audio',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
    duration: 600,
    wordCount: 1200,
    voiceCount: 1,
    status: 'completed'
  },
  {
    id: '4',
    name: 'Podcast Episode Draft',
    description: 'Script for Episode 24',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    wordCount: 2000,
    status: 'draft'
  }
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState(sampleProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const filteredProjects = projects
    .filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'updated') return b.updatedAt.getTime() - a.updatedAt.getTime()
      if (sortBy === 'created') return b.createdAt.getTime() - a.createdAt.getTime()
      return a.name.localeCompare(b.name)
    })

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}m`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400'
      case 'draft': return 'bg-gray-500/20 text-gray-400'
    }
  }

  const toggleFavorite = (id: string) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ))
  }

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setContextMenu(null)
  }

  const duplicateProject = (id: string) => {
    const project = projects.find(p => p.id === id)
    if (project) {
      const newProject = {
        ...project,
        id: Date.now().toString(),
        name: `${project.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft' as const
      }
      setProjects(prev => [newProject, ...prev])
    }
    setContextMenu(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Create and manage long-form audio content
            </p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#a1a1a1] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]"
          >
            <option value="updated">Last Updated</option>
            <option value="created">Date Created</option>
            <option value="name">Name</option>
          </select>

          <div className="flex bg-[#1f1f1f] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'list' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl overflow-hidden hover:border-[#3f3f3f] transition group ${
                  viewMode === 'list' ? 'flex items-center' : ''
                }`}
              >
                {/* Project Card */}
                <Link
                  href={`/app/projects/${project.id}`}
                  className={`block ${viewMode === 'list' ? 'flex-1 flex items-center gap-4 p-4' : 'p-4'}`}
                >
                  {/* Thumbnail/Icon */}
                  <div className={`bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-xl flex items-center justify-center ${
                    viewMode === 'list' ? 'w-14 h-14 flex-shrink-0' : 'w-full aspect-video mb-4'
                  }`}>
                    <FolderOpen className={`text-white ${viewMode === 'list' ? 'w-6 h-6' : 'w-12 h-12'}`} />
                  </div>

                  {/* Info */}
                  <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{project.name}</h3>
                      {project.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-[#a1a1a1] mt-1 truncate">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#666]">
                      <span className={`px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(project.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {project.wordCount?.toLocaleString() || 0} words
                      </span>
                    </div>
                  </div>

                  {viewMode === 'list' && (
                    <span className="text-sm text-[#666] flex-shrink-0">
                      {formatDate(project.updatedAt)}
                    </span>
                  )}
                </Link>

                {/* Actions */}
                <div className={`flex items-center gap-2 ${
                  viewMode === 'list' ? 'px-4' : 'px-4 pb-4'
                }`}>
                  {viewMode === 'grid' && (
                    <span className="text-xs text-[#666] flex-1">
                      Updated {formatDate(project.updatedAt)}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      toggleFavorite(project.id)
                    }}
                    className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                  >
                    {project.isFavorite ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="w-4 h-4 text-[#a1a1a1]" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setContextMenu({
                        id: project.id,
                        x: e.clientX,
                        y: e.clientY
                      })
                    }}
                    className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                  >
                    <MoreVertical className="w-4 h-4 text-[#a1a1a1]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-[#a1a1a1]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-[#a1a1a1] mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Create your first project to get started'}
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <div
              className="fixed z-50 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl py-2 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <Link
                href={`/app/projects/${contextMenu.id}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
                onClick={() => setContextMenu(null)}
              >
                <Edit className="w-4 h-4 text-[#a1a1a1]" />
                <span>Edit</span>
              </Link>
              <button
                onClick={() => duplicateProject(contextMenu.id)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
              >
                <Copy className="w-4 h-4 text-[#a1a1a1]" />
                <span>Duplicate</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
              >
                <Download className="w-4 h-4 text-[#a1a1a1]" />
                <span>Export</span>
              </button>
              <hr className="my-2 border-[#2f2f2f]" />
              <button
                onClick={() => deleteProject(contextMenu.id)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <NewProjectModal onClose={() => setShowNewProjectModal(false)} />
        )}
      </div>
    </div>
  )
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return
    // Navigate to new project
    window.location.href = `/app/projects/new?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Audiobook Chapter 1"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg focus:outline-none focus:border-[#7c3aed]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg h-24 resize-none focus:outline-none focus:border-[#7c3aed]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#a1a1a1] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 rounded-lg transition"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
