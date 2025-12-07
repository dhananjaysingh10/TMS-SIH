"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { ticketsApi } from "../lib/api";
import toast from "react-hot-toast";

interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentDepartment: string;
  currentUserEmail: string;
  onTransferSuccess: () => void;
}

const DEPARTMENTS = ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"];

export default function TransferTicketModal({
  isOpen,
  onClose,
  ticketId,
  currentDepartment,
  currentUserEmail,
  onTransferSuccess,
}: TransferTicketModalProps) {
  const [formData, setFormData] = useState({
    newDepartment: "",
    newAssigneeEmail: "",
    transferReason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.newDepartment) {
      toast.error("Please select a department");
      return;
    }

    if (!formData.transferReason.trim()) {
      toast.error("Please provide a reason for transfer");
      return;
    }

    setIsSubmitting(true);

    try {
      await ticketsApi.transferTicket(ticketId, {
        newDepartment: formData.newDepartment,
        newAssigneeEmail: formData.newAssigneeEmail || undefined,
        transferReason: formData.transferReason,
        transferredByEmail: currentUserEmail,
      });

      toast.success("Ticket transferred successfully!");
      onTransferSuccess();
      onClose();
      
      // Reset form
      setFormData({
        newDepartment: "",
        newAssigneeEmail: "",
        transferReason: "",
      });
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error?.message || "Failed to transfer ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        newDepartment: "",
        newAssigneeEmail: "",
        transferReason: "",
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ArrowRight size={24} />
                Transfer Ticket
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Transfer this ticket to another department or assignee
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Department Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">
              Current Department
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {currentDepartment}
            </p>
          </div>

          {/* New Department Selection */}
          <div>
            <label
              htmlFor="newDepartment"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Transfer To Department <span className="text-red-500">*</span>
            </label>
            <select
              id="newDepartment"
              name="newDepartment"
              value={formData.newDepartment}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a department...</option>
              {DEPARTMENTS.filter(dept => dept !== currentDepartment).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* New Assignee Email (Optional) */}
          <div>
            <label
              htmlFor="newAssigneeEmail"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Assign To (Optional)
            </label>
            <input
              type="email"
              id="newAssigneeEmail"
              name="newAssigneeEmail"
              value={formData.newAssigneeEmail}
              onChange={handleInputChange}
              placeholder="assignee@example.com"
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to let the new department assign it
            </p>
          </div>

          {/* Transfer Reason */}
          <div>
            <label
              htmlFor="transferReason"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Reason for Transfer <span className="text-red-500">*</span>
            </label>
            <textarea
              id="transferReason"
              name="transferReason"
              rows={4}
              required
              value={formData.transferReason}
              onChange={handleInputChange}
              placeholder="Explain why this ticket needs to be transferred..."
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400 resize-y disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Provide a clear explanation for the transfer
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.newDepartment || !formData.transferReason.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Transfer Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
