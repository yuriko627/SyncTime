import React, { useEffect, useState } from "react"
import { useScheduleStore } from "../stores/scheduleStore"
import CreateProposal from "./CreateProposal"
import UserSelector from "./UserSelector"
import CalendarIntegration from "./CalendarIntegration"
import AvailabilityView from "./AvailabilityView"
import {
  Calendar,
  Users,
  Plus,
  Settings,
  Clock,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"

const ScheduleDashboard: React.FC = () => {
  const {
    users,
    proposals,
    currentUserId,
    addUser,
    createProposal,
    respondToProposal,
    getActiveUsers,
    findCommonAvailability,
    userNames,
    setCurrentUser
  } = useScheduleStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCreateProposal, setShowCreateProposal] = useState(false)
  const [showUserSetup, setShowUserSetup] = useState(false)
  const [userName, setUserName] = useState("")

  // Initialize user if none exists
  useEffect(() => {
    if (!currentUserId) {
      setShowUserSetup(true)
    }
  }, [currentUserId])

  const handleUserSetup = () => {
    if (userName.trim()) {
      const userId = addUser({
        name: userName,
        calendarConnected: false
      })
      setCurrentUser(userId)
      setShowUserSetup(false)
    }
  }

  const activeUsers = getActiveUsers()
  const todayProposals = Object.values(proposals).filter(
    (proposal) => proposal.status === "pending"
  )

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1))
    setCurrentDate(newDate)
  }

  // User setup modal
  if (showUserSetup) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Join Scheduling Session</h2>
          <p className="text-gray-600 mb-4">
            Enter your name to join the collaborative scheduling session.
          </p>
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            onKeyPress={(e) => e.key === "Enter" && handleUserSetup()}
          />
          <button
            onClick={handleUserSetup}
            disabled={!userName.trim()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Collaborative Scheduler
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                {activeUsers.length} participant
                {activeUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-80 bg-white shadow-sm border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            {/* Active Users */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Participants
              </h3>
              <div className="space-y-2 mb-4">
                {activeUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                    {user.calendarConnected && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
              <UserSelector />
            </div>

            {/* Meeting Proposals */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Meeting Proposals
                </h3>
                <button
                  onClick={() => setShowCreateProposal(true)}
                  className="flex items-center space-x-1 text-blue-500 hover:text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">New</span>
                </button>
              </div>

              <div className="space-y-3">
                {todayProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {proposal.title}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {proposal.duration}min
                      </span>
                    </div>

                    {proposal.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {proposal.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-500 mb-3">
                      by {userNames[proposal.createdBy] || "Unknown"}
                    </div>

                    {/* Response buttons */}
                    {currentUserId && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            respondToProposal(proposal.id, "available")
                          }
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            {
                              available: "bg-green-100 text-green-700",
                              maybe:
                                "bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700",
                              unavailable:
                                "bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700"
                            }[proposal.responses[currentUserId] || "maybe"]
                          }`}
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Available</span>
                        </button>
                        <button
                          onClick={() =>
                            respondToProposal(proposal.id, "maybe")
                          }
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            {
                              maybe: "bg-yellow-100 text-yellow-700",
                              available:
                                "bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700",
                              unavailable:
                                "bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700"
                            }[proposal.responses[currentUserId] || "maybe"]
                          }`}
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Maybe</span>
                        </button>
                        <button
                          onClick={() =>
                            respondToProposal(proposal.id, "unavailable")
                          }
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            {
                              unavailable: "bg-red-100 text-red-700",
                              available:
                                "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700",
                              maybe:
                                "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700"
                            }[proposal.responses[currentUserId] || "maybe"]
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Unavailable</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {todayProposals.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No meeting proposals yet</p>
                    <p className="text-xs">Create one to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateDate("prev")}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatDate(currentDate)}
                </h2>
                <button
                  onClick={() => navigateDate("next")}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm text-blue-500 hover:text-blue-600"
              >
                Today
              </button>
            </div>

            {/* Calendar Integration */}
            <div className="mb-6">
              <CalendarIntegration />
            </div>

            {/* Availability View */}
            <AvailabilityView />
          </div>
        </main>
      </div>

      {/* Create Proposal Modal */}
      <CreateProposal
        isOpen={showCreateProposal}
        onClose={() => setShowCreateProposal(false)}
      />
    </div>
  )
}

export default ScheduleDashboard
