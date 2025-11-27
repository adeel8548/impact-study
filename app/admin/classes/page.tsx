"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client" // supabase client

export default function ClassManagement() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([]) // store classes
  const [modalOpen, setModalOpen] = useState(false)
  const [className, setClassName] = useState("")
  const [saving, setSaving] = useState(false)


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null")
    if (!user || user.role !== "admin") {
      router.push("/")
    } else {
      setIsLoading(false)
      fetchClasses()
    }
  }, [router])

  // Fetch classes from Supabase
  const fetchClasses = async () => {
    const supabase = createClient()
    if (!supabase) return

    const { data, error } = await supabase.from("classes").select("*")
    if (data) setClasses(data)
  }

  // Add new class
  const handleAddClass = async () => {
    if (!className) return
    setSaving(true)

    const supabase = createClient()
    if (!supabase) {
      console.error("Supabase client not available")
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("classes")
      .insert([{ name: className }])
      .select()
      .single()

    if (error) {
      console.error(error)
      setSaving(false)
      return
    }

    setClasses([...classes, data])
    setClassName("")
    setModalOpen(false)
    setSaving(false)
  }

  if (isLoading) return null

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div className="px-2 md:px-0">
              <h1 className="text-4xl font-bold text-foreground mb-2">Class Management</h1>
              <p className="text-muted-foreground">Manage classes and assign teachers</p>
            </div>
            <Button
              className="gap-2 bg-primary text-primary-foreground"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Class
            </Button>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes?.map((cls) => (
              <Card key={cls.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 hover:text-red-700 bg-transparent"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-foreground mb-1">{cls.name}</h3>
              </Card>
            ))}
          </div>

          {/* Modal */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-lg w-80 shadow-lg">
                <h2 className="text-lg font-bold mb-4">Add New Class</h2>
                <Input
                  placeholder="Class Name"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="mb-4"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddClass} disabled={saving}>
                    {saving ? "Saving..." : "Add"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
