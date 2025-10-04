"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { ticketsApi } from "../lib/api";
import type { NewTicketData } from "../lib/api";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
}: CreateTicketModalProps) {
  const user = useSelector(selectCurrentUser);
  const [formData, setFormData] = useState({
    description: "",
    department: "IT",
    priority: "medium",
    assignedemail: "",
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
    setIsSubmitting(true);
    const useremail=user?user.email:"test-user@gmail.com";
    const ticketData: NewTicketData = {
      ...formData,
      useremail,
    };

    try {
      console.log(ticketData);
      await ticketsApi.create(ticketData);
      
      toast.success("Ticket created successfully!");
      onTicketCreated();
    } catch (error) {
      toast.error("Failed to create ticket. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Ticket
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {/* CORRECTED TYPO: 'text-black-700' is not a valid Tailwind class. Changed to 'text-gray-700'. */}
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleInputChange}
              // FIX: Explicitly set the text color to ensure it's visible.
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                // FIX: Explicitly set the text color.
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option>IT</option>
                <option>DevOps</option>
                <option>Software</option>
                <option>Networking</option>
                <option>Cybersecurity</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                // FIX: Explicitly set the text color.
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="assignedemail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Assign To (Optional Email)
            </label>
            <input
              type="email"
              id="assignedemail"
              name="assignedemail"
              value={formData.assignedemail}
              onChange={handleInputChange}
              // FIX: Explicitly set the text color.
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSubmitting ? "Submitting..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
