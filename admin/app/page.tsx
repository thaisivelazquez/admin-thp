'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [profiles, setProfiles] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [captions, setCaptions] = useState<any[]>([])

  const [page, setPage] = useState(1)
  const IMAGES_PER_PAGE = 20

  const fetchAll = async (currentPage: number) => {
    const from = (currentPage - 1) * IMAGES_PER_PAGE
    const to = from + IMAGES_PER_PAGE - 1

    const [profilesRes, imagesRes, captionsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('images').select('*').range(from, to),
      supabase.from('captions').select('*'),
    ])

    if (!profilesRes.error) setProfiles(profilesRes.data)
    if (!imagesRes.error) setImages(imagesRes.data)
    if (!captionsRes.error) setCaptions(captionsRes.data)
  }

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_superadmin')
          .eq('id', user.id)
          .single()

        if (!error) {
          const admin = data?.is_superadmin ?? false
          setIsAdmin(admin)
          if (admin) await fetchAll(1)
        } else {


          setIsAdmin(false)
        }
      }
    }

    loadUser()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchAll(page)
  }, [page])

  const refreshImages = async () => {
    const from = (page - 1) * IMAGES_PER_PAGE
    const to = from + IMAGES_PER_PAGE - 1
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .range(from, to)
    if (!error) setImages(data)
  }

  const updateImage = async (id: string, newUrl: string) => {
    const { error } = await supabase
      .from('images')
      .update({ url: newUrl })
      .eq('id', id)
    if (!error) refreshImages()
  }

  const deleteImage = async (id: string) => {
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', id)
    if (!error) refreshImages()
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' }
      }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(null)
    setProfiles([])
    setImages([])
    setCaptions([])
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Login</h2>
        <button onClick={loginWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (isAdmin === null) {
    return <p style={{ textAlign: 'center' }}>Loading...</p>
  }

  const nextPage = () => setPage((prev) => prev + 1)
  const prevPage = () => setPage((prev) => Math.max(prev - 1, 1))

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <p>Logged in as: {user.email}</p>

      {isAdmin ? (
        <h1 style={{ color: 'green' }}>YES (Admin)</h1>
      ) : (
        <h1 style={{ color: 'red' }}>NO</h1>
      )}

      <button onClick={logout}>Sign Out</button>

      {isAdmin ? (
        <>
          <h2>Profiles</h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>First Name</th>
                <th style={{ padding: '8px' }}>Last Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Superadmin</th>
                <th style={{ padding: '8px' }}>In Study</th>
                <th style={{ padding: '8px' }}>Matrix Admin</th>
                <th style={{ padding: '8px' }}>Created</th>
                <th style={{ padding: '8px' }}>Modified</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td style={{ padding: '8px' }}>{profile.id}</td>
                  <td style={{ padding: '8px' }}>{profile.first_name}</td>
                  <td style={{ padding: '8px' }}>{profile.last_name}</td>
                  <td style={{ padding: '8px' }}>{profile.email}</td>
                  <td style={{ padding: '8px' }}>{profile.is_superadmin ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{profile.is_in_study ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{profile.is_matrix_admin ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{new Date(profile.created_datetime_utc).toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>{new Date(profile.modified_datetime_utc).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Images (Page {page})</h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Preview</th>
                <th style={{ padding: '8px' }}>URL</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id}>
                  <td style={{ padding: '8px' }}>{img.id}</td>
                  <td style={{ padding: '8px' }}>
                    <img src={img.url} alt="" width={80} />
                  </td>
                  <td style={{ padding: '8px' }}>{img.url}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => deleteImage(img.id)}>Delete</button>
                    <button
                      style={{ marginLeft: '6px' }}
                      onClick={() => updateImage(img.id, prompt('New URL?') || img.url)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '10px' }}>
            <button onClick={prevPage} disabled={page === 1}>⬅️ Previous</button>
            <button onClick={nextPage} style={{ marginLeft: '10px' }}>Next ➡️</button>
          </div>

          <h2>Captions</h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {captions.map((caption) => (
                <tr key={caption.id}>
                  <td style={{ padding: '8px' }}>{caption.id}</td>
                  <td style={{ padding: '8px' }}>{JSON.stringify(caption)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p style={{ color: 'red', marginTop: '20px' }}>
          You do not have permission to view this content.
        </p>
      )}
    </div>
  )
}
