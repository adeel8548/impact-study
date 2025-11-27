"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createTeacher, updateTeacher, assignTeacherToClass } from "@/lib/actions/teacher"

interface TeacherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: {
    id: string
    name: string
    email: string
    phone?: string
    class_ids?: string[]
  } | null
  classes: { id: string; name: string }[]
  onSuccess?: () => void
}

export function TeacherModal({ open, onOpenChange, teacher, classes, onSuccess }: TeacherModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    class_ids: [] as string[],
  })

  const isEditing = !!teacher

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || "",
        password: "",
        class_ids: (teacher as any).class_ids || [],
      })
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        class_ids: [],
      })
    }
  }, [teacher, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        if (isEditing) {
        const { error } = await updateTeacher(teacher.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        })
        if (error) {
          setError(error)
          return toast.error(error)
        }

        // Update classes
        for (const cls of formData.class_ids) {
          await assignTeacherToClass(teacher.id, cls)
        }

        toast.success("Teacher updated successfully")
      } else {
        if (!formData.password) {
          setError("Password is required for new teachers")
          return toast.error("Password is required for new teachers")
        }

        const { teacher: newTeacher, error } = await createTeacher({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          class_ids: formData.class_ids,
        })

        if (error) {
          setError(error)
          return toast.error(error)
        }

        toast.success("Teacher created successfully")
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClassToggle = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update teacher information below"
              : "Fill in the details to create a new teacher account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"><path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter teacher's name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter initial password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {/* Classes multi-select */}
          <div className="space-y-2">
            <Label>Assign Classes</Label>
            <div className="flex flex-wrap gap-2">
              {classes?.map((cls) => (
                <Button
                  key={cls.id}
                  type="button"
                  size="sm"
                  variant={formData.class_ids.includes(cls.id) ? "default" : "outline"}
                  onClick={() => handleClassToggle(cls.id)}
                  disabled={loading}
                >
                  {cls.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Update" : "Create"} Teacher
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
