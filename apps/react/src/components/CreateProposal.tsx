import React, { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { useScheduleStore } from "../stores/scheduleStore"

interface CreateProposalProps {
  isOpen: boolean
  onClose: () => void
}

const CreateProposal: React.FC<CreateProposalProps> = ({ isOpen, onClose }) => {
  const { createProposal } = useScheduleStore()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    proposedTimes: [{ start: "", end: "" }]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) return

    // Filter out empty time slots
    const validTimes = formData.proposedTimes.filter(
      (time) => time.start && time.end
    )

    if (validTimes.length === 0) return

    // createProposal({
    //   title: formData.title,
    //   description: formData.description || undefined,
    //   duration: formData.duration,
    //   proposedTimes: validTimes,
    //   createdBy:
    // });

    // Reset form
    setFormData({
      title: "",
      description: "",
      duration: 60,
      proposedTimes: [{ start: "", end: "" }]
    })

    onClose()
  }

  const addTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      proposedTimes: [...prev.proposedTimes, { start: "", end: "" }]
    }))
  }

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proposedTimes: prev.proposedTimes.filter((_, i) => i !== index)
    }))
  }

  const updateTimeSlot = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      proposedTimes: prev.proposedTimes.map((time, i) =>
        i === index ? { ...time, [field]: value } : time
      )
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Create Meeting Proposal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team Standup"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional meeting description..."
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  duration: parseInt(e.target.value)
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          {/* Proposed Times */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Proposed Times *
              </label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="flex items-center space-x-1 text-blue-500 hover:text-blue-600 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Time</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.proposedTimes.map((time, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="datetime-local"
                    value={time.start}
                    onChange={(e) =>
                      updateTimeSlot(index, "start", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="datetime-local"
                    value={time.end}
                    onChange={(e) =>
                      updateTimeSlot(index, "end", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {formData.proposedTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !formData.title.trim() ||
                formData.proposedTimes.every((time) => !time.start || !time.end)
              }
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProposal
