'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'

interface Voter {
  id: string
  voter_id?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  monitor_id: string
  [key: string]: any
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [voters, setVoters] = useState<Voter[]>([])
  const [votersLoading, setVotersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Voter | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchVoters()
    }
  }, [user])

  const fetchVoters = async () => {
    if (!user) return

    try {
      setVotersLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('voters')
        .select('*')
        .eq('monitor_id', user.id)

      if (fetchError) {
        throw fetchError
      }

      setVoters(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch voters')
    } finally {
      setVotersLoading(false)
    }
  }

//   const handleAddVoter = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault()
//     if (!user) return

//     const formData = new FormData(e.currentTarget)
//     const voter_id = formData.get('voter_id') as string
//     const name = formData.get('name') as string
//     const phone = formData.get('phone') as string

//     try {
//       setError(null)

//       const { error: insertError } = await supabase
//         .from('voters')
//         .insert([
//           {
//             voter_id,
//             name,
//             phone,
//             monitor_id: user.id,
//           },
//         ])

//       if (insertError) {
//         // Check if it's a duplicate key error
//         if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
//           setError('A voter with this voter_id already exists.')
//         } else {
//           setError(insertError.message || 'Failed to add voter')
//         }
//         return
//       }

//       // Reset form
//       e.currentTarget.reset()
      
//       // Refresh the voters list
//       fetchVoters()
//     } catch (err: any) {
//       setError(err.message || 'Failed to add voter')
//     }
//   }
const handleAddVoter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return
  
    const form = e.currentTarget  // ✅ SAVE REFERENCE EARLY
    const formData = new FormData(form)
  
    const voter_id = formData.get('voter_id') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
  
    try {
      setError(null)
  
      const { error: insertError } = await supabase
        .from('voters')
        .insert([
          {
            voter_id,
            name,
            phone,
            monitor_id: user.id,
          },
        ])
  
      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate voter_id - fetch existing voter and monitor info
          try {
            const { data: existingVoter, error: fetchVoterError } = await supabase
              .from('voters')
              .select('monitor_id')
              .eq('voter_id', voter_id)
              .single()
            
            if (!fetchVoterError && existingVoter?.monitor_id) {
              // Fetch monitor details
              const { data: monitor, error: fetchMonitorError } = await supabase
                .from('monitors')
                .select('email, name')
                .eq('id', existingVoter.monitor_id)
                .single()
              
              if (!fetchMonitorError && monitor) {
                const monitorInfo = monitor.email || monitor.name || existingVoter.monitor_id
                setError(`This voter is already assigned to monitor: ${monitorInfo}`)
              } else {
                // Fallback if monitor table doesn't exist or RLS prevents access
                setError('This voter is already assigned to another monitor.')
              }
            } else {
              // Fallback if we can't fetch the voter (RLS restriction)
              setError('A voter with this voter ID already exists.')
            }
          } catch (fetchErr: any) {
            // Graceful error handling
            setError('A voter with this voter ID already exists.')
          }
        } else {
          setError(insertError.message || 'Failed to add voter')
        }
        return
      }
  
      // ✅ SAFE RESET
      form.reset()
  
      // Refresh list
      fetchVoters()
    } catch (err: any) {
      setError(err.message || 'Failed to add voter')
    }
  }
  

  const handleEditVoter = (voter: Voter) => {
    setEditingVoter(voter)
    setEditName(voter.name || '')
    setEditPhone(voter.phone || '')
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingVoter(null)
    setEditName('')
    setEditPhone('')
    setError(null)
  }

  const handleUpdateVoter = async () => {
    if (!user || !editingVoter) return

    try {
      setIsUpdating(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('voters')
        .update({
          name: editName,
          phone: editPhone,
        })
        .eq('id', editingVoter.id)
        .eq('monitor_id', user.id)

      if (updateError) {
        setError(updateError.message || 'Failed to update voter')
        setIsUpdating(false)
        return
      }

      handleCancelEdit()
      fetchVoters()
    } catch (err: any) {
      setError(err.message || 'Failed to update voter')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteVoter = (voter: Voter) => {
    setDeleteConfirm(voter)
    setError(null)
  }

  const handleCancelDelete = () => {
    setDeleteConfirm(null)
    setError(null)
  }

  const handleConfirmDelete = async () => {
    if (!user || !deleteConfirm) return

    try {
      setIsDeleting(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('voters')
        .delete()
        .eq('id', deleteConfirm.id)
        .eq('monitor_id', user.id)

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete voter')
        setIsDeleting(false)
        return
      }

      handleCancelDelete()
      fetchVoters()
    } catch (err: any) {
      setError(err.message || 'Failed to delete voter')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Voters List</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">Manage your voters list</p>
        </div>

        {/* Add Voter Form */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add New Voter</h2>
          <form onSubmit={handleAddVoter} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="voter_id" className="block text-sm font-medium text-gray-700">
                  Voter ID *
                </label>
                <input
                  type="text"
                  id="voter_id"
                  name="voter_id"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter voter ID"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Add Voter
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="rounded-lg bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Voters List</h2>
          </div>

          {votersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Loading voters...</p>
              </div>
            </div>
          ) : voters.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No voters found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {voters.map((voter) => (
                    <tr key={voter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {voter.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {voter.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {voter.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditVoter(voter)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVoter(voter)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingVoter && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCancelEdit}
            ></div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Edit Voter
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Voter ID
                    </label>
                    <input
                      type="text"
                      value={editingVoter.voter_id || ''}
                      disabled
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleUpdateVoter}
                  disabled={isUpdating}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCancelDelete}
            ></div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Delete Voter
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this voter? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

