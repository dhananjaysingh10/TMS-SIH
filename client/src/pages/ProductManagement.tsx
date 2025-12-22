import {
    Building2,
    Check,
    ChevronRight,
    Edit2,
    FolderKanban,
    Loader2,
    Plus,
    Tag,
    Trash2,
    UserMinus,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
    departmentApi,
    productApi,
    usersApi,
    type Department,
    type Product,
    type UserBasic,
} from "../lib/api";
import { selectCurrentUser } from "../redux/user/userSlice";

export default function ProductManagement() {
    const currentUser = useSelector(selectCurrentUser);
    const [products, setProducts] = useState<Product[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showProductModal, setShowProductModal] = useState(false);
    const [showDepartmentModal, setShowDepartmentModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

    // Form states
    const [productForm, setProductForm] = useState({ name: "", description: "" });
    const [departmentForm, setDepartmentForm] = useState({ name: "", description: "", keywords: [] as string[] });
    const [keywordInput, setKeywordInput] = useState("");

    // Member management states
    const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
    const [emailSearch, setEmailSearch] = useState("");
    const [memberLoading, setMemberLoading] = useState(false);

    // Admin assignment states (for super-admin)
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminSearchEmail, setAdminSearchEmail] = useState("");
    const [selectedProductForAdmin, setSelectedProductForAdmin] = useState<Product | null>(null);

    // Helper to check if current user can edit a product
    const canEditProduct = (product: Product) => {
        if (currentUser?.role === 'super-admin') return true;
        if (currentUser?.role === 'admin' && (product as any).admin?._id === currentUser.id) return true;
        return false;
    };

    // Redirect non-admin users
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        fetchProducts();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            fetchDepartments(selectedProduct._id);
        }
    }, [selectedProduct]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let data = await productApi.getAll();

            // For admins, filter to only show products they manage
            if (currentUser?.role === 'admin') {
                data = data.filter((p: any) => p.admin?._id === currentUser.id);
            }

            setProducts(data);
            if (data.length > 0 && !selectedProduct) {
                setSelectedProduct(data[0]);
            }
        } catch (err) {
            setError("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async (productId: string) => {
        try {
            const data = await departmentApi.getAll(productId);
            setDepartments(data);
        } catch (err) {
            console.error("Failed to load departments", err);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await usersApi.getAll();
            console.log("Fetched users:", data);
            setAllUsers(data || []);
        } catch (err) {
            console.error("Failed to load users", err);
        }
    };

    const handleAddMember = async (userId: string) => {
        if (!editingDepartment) return;
        try {
            setMemberLoading(true);
            await departmentApi.addMember(editingDepartment._id, userId);
            // Refresh department data
            const updated = await departmentApi.getById(editingDepartment._id);
            setEditingDepartment(updated);
            if (selectedProduct) {
                fetchDepartments(selectedProduct._id);
            }
        } catch (err) {
            alert("Failed to add member");
        } finally {
            setMemberLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!editingDepartment) return;
        try {
            setMemberLoading(true);
            await departmentApi.removeMember(editingDepartment._id, userId);
            // Refresh department data
            const updated = await departmentApi.getById(editingDepartment._id);
            setEditingDepartment(updated);
            if (selectedProduct) {
                fetchDepartments(selectedProduct._id);
            }
        } catch (err) {
            alert("Failed to remove member");
        } finally {
            setMemberLoading(false);
        }
    };

    // Product CRUD
    const handleSaveProduct = async () => {
        try {
            if (editingProduct) {
                await productApi.update(editingProduct._id, productForm);
            } else {
                await productApi.create(productForm);
            }
            setShowProductModal(false);
            setEditingProduct(null);
            setProductForm({ name: "", description: "" });
            fetchProducts();
        } catch (err) {
            alert("Failed to save product");
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Delete this product and all its teams?")) return;
        try {
            await productApi.delete(id);
            if (selectedProduct?._id === id) {
                setSelectedProduct(null);
                setDepartments([]);
            }
            fetchProducts();
        } catch (err) {
            alert("Failed to delete product");
        }
    };

    // Department CRUD
    const handleSaveDepartment = async () => {
        if (!selectedProduct) return;
        try {
            if (editingDepartment) {
                await departmentApi.update(editingDepartment._id, departmentForm);
            } else {
                await departmentApi.create({
                    ...departmentForm,
                    product: selectedProduct._id,
                });
            }
            setShowDepartmentModal(false);
            setEditingDepartment(null);
            setDepartmentForm({ name: "", description: "", keywords: [] });
            setKeywordInput("");
            fetchDepartments(selectedProduct._id);
        } catch (err) {
            alert("Failed to save team");
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm("Delete this team?")) return;
        try {
            await departmentApi.delete(id);
            if (selectedProduct) {
                fetchDepartments(selectedProduct._id);
            }
        } catch (err) {
            alert("Failed to delete team");
        }
    };

    const openEditProduct = (product: Product) => {
        setEditingProduct(product);
        setProductForm({ name: product.name, description: product.description });
        setShowProductModal(true);
    };

    const openEditDepartment = (dept: Department) => {
        setEditingDepartment(dept);
        setDepartmentForm({
            name: dept.name,
            description: dept.description,
            keywords: dept.keywords || []
        });
        setKeywordInput("");
        setShowDepartmentModal(true);
    };

    if (loading) {
        return (
            <Layout pageTitle="Product Management">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout pageTitle="Product Management">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Product & Team Management</h1>
                        <p className="text-gray-500 mt-1">Organize your teams by products</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setProductForm({ name: "", description: "" });
                            setShowProductModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        New Product
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Products List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <FolderKanban className="w-5 h-5 text-blue-500" />
                                    Products
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                                {products.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        No products yet
                                    </div>
                                ) : (
                                    products.map((product) => (
                                        <div
                                            key={product._id}
                                            onClick={() => setSelectedProduct(product)}
                                            className={`p-4 cursor-pointer transition-colors ${selectedProduct?._id === product._id
                                                ? "bg-blue-50 border-l-4 border-blue-500"
                                                : "hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                                    <p className="text-sm text-gray-500 line-clamp-1">{product.description || "No description"}</p>
                                                    {/* Show product admin */}
                                                    {(product as any).admin ? (
                                                        <p className="text-xs text-purple-600 mt-1">
                                                            Admin: {(product as any).admin.name}
                                                        </p>
                                                    ) : currentUser?.role === 'super-admin' && (
                                                        <p className="text-xs text-orange-500 mt-1">No admin assigned</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {/* Assign admin button - super-admin only */}
                                                    {currentUser?.role === "super-admin" && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedProductForAdmin(product);
                                                                setShowAdminModal(true);
                                                                setAdminSearchEmail("");
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Assign Admin"
                                                        >
                                                            <Users className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Edit button - only if can edit */}
                                                    {canEditProduct(product) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditProduct(product); }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {currentUser?.role === "super-admin" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product._id); }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Departments List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-purple-500" />
                                    Teams {selectedProduct && `in ${selectedProduct.name}`}
                                </h2>
                                {selectedProduct && (
                                    <button
                                        onClick={() => {
                                            setEditingDepartment(null);
                                            setDepartmentForm({ name: "", description: "", keywords: [] });
                                            setKeywordInput("");
                                            setShowDepartmentModal(true);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Team
                                    </button>
                                )}
                            </div>

                            {!selectedProduct ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Building2 className="w-16 h-16 mx-auto mb-3 opacity-30" />
                                    <p>Select a product to view teams</p>
                                </div>
                            ) : departments.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Building2 className="w-16 h-16 mx-auto mb-3 opacity-30" />
                                    <p>No teams in this product</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {departments.map((dept) => (
                                        <div key={dept._id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                                                    <p className="text-sm text-gray-500">{dept.description || "No description"}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="flex items-center gap-1 text-sm text-gray-500">
                                                            <Users className="w-4 h-4" />
                                                            {dept.members.length} members
                                                        </span>
                                                        {dept.lead && (
                                                            <span className="text-sm text-gray-500">
                                                                Lead: <span className="font-medium text-gray-700">{dept.lead.name}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Members avatars */}
                                                    {dept.members.length > 0 && (
                                                        <div className="flex -space-x-2 mt-3">
                                                            {dept.members.slice(0, 5).map((m) => (
                                                                <img
                                                                    key={m._id}
                                                                    src={m.profilePicture}
                                                                    alt={m.name}
                                                                    title={m.name}
                                                                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                                                />
                                                            ))}
                                                            {dept.members.length > 5 && (
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                                                    +{dept.members.length - 5}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditDepartment(dept)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Manage
                                                    </button>
                                                    <button
                                                        onClick={() => openEditDepartment(dept)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {currentUser?.role === "super-admin" && (
                                                        <button
                                                            onClick={() => handleDeleteDepartment(dept._id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Product Modal */}
                {showProductModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingProduct ? "Edit Product" : "New Product"}
                                </h3>
                                <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={productForm.name}
                                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Product name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={productForm.description}
                                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        placeholder="Optional description"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setShowProductModal(false)}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProduct}
                                        disabled={!productForm.name.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Check className="w-5 h-5" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Department Modal */}
                {showDepartmentModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b shrink-0">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingDepartment ? "Edit Team" : "New Team"}
                                </h3>
                                <button onClick={() => setShowDepartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1 p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={departmentForm.name}
                                        onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Team name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={departmentForm.description}
                                        onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        rows={3}
                                        placeholder="Optional description"
                                    />
                                </div>


                                {/* Member Management - only show when editing */}
                                {editingDepartment && (
                                    <div className="border-t pt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            Members ({editingDepartment.members.length})
                                        </label>

                                        {/* Current members */}
                                        {editingDepartment.members.length > 0 && (
                                            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                                                {editingDepartment.members.map((member) => (
                                                    <div key={member._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={member.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                                                alt={member.name}
                                                                className="w-7 h-7 rounded-full object-cover"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">{member.name}</p>
                                                                <p className="text-xs text-gray-500">{member.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(member._id)}
                                                            disabled={memberLoading}
                                                            className="p-1 text-red-500 hover:bg-red-100 rounded disabled:opacity-50"
                                                            title="Remove member"
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add member by email search */}
                                        <div>
                                            <input
                                                type="text"
                                                value={emailSearch}
                                                onChange={(e) => setEmailSearch(e.target.value)}
                                                placeholder="Search by email..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            {emailSearch.trim() && (
                                                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                                                    {allUsers
                                                        .filter(u =>
                                                            u.email?.toLowerCase().includes(emailSearch.toLowerCase()) &&
                                                            !editingDepartment.members.some(m => m._id === u._id)
                                                        )
                                                        .slice(0, 5)
                                                        .map((user) => (
                                                            <button
                                                                key={user._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleAddMember(user._id);
                                                                    setEmailSearch("");
                                                                }}
                                                                disabled={memberLoading}
                                                                className="w-full flex items-center justify-between p-2 hover:bg-purple-50 text-left disabled:opacity-50 border-b last:border-b-0"
                                                            >
                                                                <span className="text-sm text-gray-800">{user.email}</span>
                                                                <span className="text-xs text-green-600">+ Add</span>
                                                            </button>
                                                        ))}
                                                    {allUsers.filter(u =>
                                                        u.email?.toLowerCase().includes(emailSearch.toLowerCase()) &&
                                                        !editingDepartment.members.some(m => m._id === u._id)
                                                    ).length === 0 && (
                                                            <p className="p-2 text-sm text-gray-500 text-center">No users found</p>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 p-6 border-t shrink-0">
                                <button
                                    onClick={() => setShowDepartmentModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDepartment}
                                    disabled={!departmentForm.name.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-5 h-5" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Assignment Modal */}
                {showAdminModal && selectedProductForAdmin && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="flex items-center justify-between p-6 border-b">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Assign Admin for {selectedProductForAdmin.name}
                                </h3>
                                <button onClick={() => setShowAdminModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6">
                                {/* Current admin */}
                                {(selectedProductForAdmin as any).admin && (
                                    <div className="mb-4 p-3 bg-purple-50 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={(selectedProductForAdmin as any).admin.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((selectedProductForAdmin as any).admin.name)}`}
                                                alt={(selectedProductForAdmin as any).admin.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div>
                                                <p className="font-medium text-gray-800">{(selectedProductForAdmin as any).admin.name}</p>
                                                <p className="text-xs text-gray-500">{(selectedProductForAdmin as any).admin.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await productApi.setAdmin(selectedProductForAdmin._id, null);
                                                    fetchProducts();
                                                    setShowAdminModal(false);
                                                } catch (err) {
                                                    alert("Failed to remove admin");
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}

                                {/* Search for new admin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search user by email to assign as admin
                                    </label>
                                    <input
                                        type="text"
                                        value={adminSearchEmail}
                                        onChange={(e) => setAdminSearchEmail(e.target.value)}
                                        placeholder="Search by email..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    {adminSearchEmail.trim() && (
                                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                            {allUsers
                                                .filter(u =>
                                                    u.email?.toLowerCase().includes(adminSearchEmail.toLowerCase()) &&
                                                    u._id !== (selectedProductForAdmin as any).admin?._id
                                                )
                                                .slice(0, 5)
                                                .map((user) => (
                                                    <button
                                                        key={user._id}
                                                        onClick={async () => {
                                                            try {
                                                                await productApi.setAdmin(selectedProductForAdmin._id, user._id);
                                                                fetchProducts();
                                                                setShowAdminModal(false);
                                                            } catch (err) {
                                                                alert("Failed to assign admin");
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-between p-3 hover:bg-purple-50 text-left border-b last:border-b-0"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-800">{user.name || user.email}</p>
                                                            <p className="text-xs text-gray-500">{user.email}</p>
                                                        </div>
                                                        <span className="text-xs text-purple-600 font-medium">Assign</span>
                                                    </button>
                                                ))}
                                            {allUsers.filter(u =>
                                                u.email?.toLowerCase().includes(adminSearchEmail.toLowerCase()) &&
                                                u._id !== (selectedProductForAdmin as any).admin?._id
                                            ).length === 0 && (
                                                    <p className="p-3 text-sm text-gray-500 text-center">No users found</p>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-6 border-t">
                                <button
                                    onClick={() => setShowAdminModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
