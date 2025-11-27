"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, User, Edit2, Trash2 } from "lucide-react";
import { AdminModal } from "@/components/modals/admin-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { deleteProfile } from "@/lib/actions/profiles";
import type { Profile } from "@/lib/types";

interface AdminsClientComponentProps {
  initialAdmins: Profile[];
}

export function AdminsClientComponent({
  initialAdmins,
}: AdminsClientComponentProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  const handleOpenModal = (admin?: Profile) => {
    setSelectedAdmin(admin);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    // Refresh admins list
    window.location.reload();
  };

  const handleDeleteClick = (adminId: string) => {
    setAdminToDelete(adminId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (adminToDelete) {
      await deleteProfile(adminToDelete);
      setAdmins(admins.filter((a) => a.id !== adminToDelete));
      setDeleteModalOpen(false);
      setAdminToDelete(null);
    }
  };

  return (
    <>
      <Button
        onClick={() => handleOpenModal()}
        className="gap-2 bg-primary text-primary-foreground"
      >
        <Plus className="w-4 h-4" />
        Add Admin
      </Button>

      <div className="mt-8 space-y-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Name
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Email
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Role
                  </th>
                  <th className="text-center p-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-border hover:bg-secondary/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-foreground">
                          {admin.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground">{admin.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                        {admin.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(admin)}
                          className="gap-1 bg-transparent"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(admin.id)}
                          className="gap-1 text-red-600 hover:text-red-700 bg-transparent"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {admins.length === 0 && (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No admins found</p>
          </Card>
        )}
      </div>

      <AdminModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        admin={selectedAdmin}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Admin"
        description="Are you sure you want to delete this admin? This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
