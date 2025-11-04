'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function Home() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const api = "http://localhost:8080"
  const client = useQueryClient()

  useEffect(() => {
    const stored = localStorage.getItem("token")
    if (stored) setToken(stored)
  }, [])

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => (await axios.get(`${api}/posts`)).data,
  })

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${api}/auth/login`, { username, password })
      const t = res.data.token
      setToken(t)
      localStorage.setItem("token", t)
      setUsername("")
      setPassword("")
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed")
    }
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem("token")
  }

  const createPost = useMutation({
    mutationFn: async () => {
      await axios.post(
        `${api}/posts`,
        { title, body },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["posts"] })
      setTitle("")
      setBody("")
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to create post")
    },
  })

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-gray-900 px-6 py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
          {/* 🔹 Anotación 1: muestra credenciales ejemplo */}
          <p className="mt-4 text-center text-sm text-gray-400">
            Credentials: <span className="text-indigo-400">ejemplo / ejemplo</span> or <span className="text-indigo-400">admin / admin</span>
          </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={login} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-100">
                Username
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-100">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>

          {/* 🔹 Anotación 2: recordatorio visible al final */}
          <p className="mt-6 text-center text-xs text-gray-500">
            Demo login: <span className="text-indigo-400">ejemplo / ejemplo</span> or <span className="text-indigo-400">admin / admin</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 px-6 py-12 text-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl space-y-10">
        {/* Header and Logout */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Create a Post</h2>
          <button
            onClick={logout}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Logout
          </button>
        </div>

        {/* Create Post Form */}
        <div className="bg-white/5 p-6 rounded-xl shadow-lg space-y-4 border border-white/10">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md bg-white/10 px-3 py-2 text-white placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
          />
          <textarea
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-md bg-white/10 px-3 py-2 text-white h-24 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
          />
          <button
            onClick={() => createPost.mutate()}
            disabled={createPost.isPending}
            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            {createPost.isPending ? "Posting..." : "Create Post"}
          </button>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Posts</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading...</p>
          ) : posts?.length ? (
            posts.map((p: any) => (
              <div
                key={p.id}
                className="rounded-lg bg-white/5 p-5 border border-white/10 shadow hover:bg-white/10 transition"
              >
                <h3 className="font-semibold text-lg text-white">{p.title}</h3>
                <p className="mt-2 text-gray-300">{p.body}</p>
                <p className="text-sm text-gray-500 mt-3">By {p.author}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No posts found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
