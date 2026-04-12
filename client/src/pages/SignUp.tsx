import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { signInFailure, signInSuccess } from '../redux/user/userSlice';

interface Department {
  _id: string;
  name: string;
  product?: {
    _id: string;
    name: string;
  };
}

const SignUp: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const [groupedDepartments, setGroupedDepartments] = useState<Record<string, Department[]>>({});
  const [legacyDepartments, setLegacyDepartments] = useState<string[]>([]);
  const [loadingDepts, setLoadingDepts] = useState<boolean>(true);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/ticket/departments`);
      if (response.data.success) {
        const depts: Department[] = response.data.departments;
        const legacy: string[] = response.data.legacyDepartments || [];

        // Group by Product Name
        const groups: Record<string, Department[]> = {};
        depts.forEach((dept) => {
          const prodName = dept.product?.name || "General";
          if (!groups[prodName]) groups[prodName] = [];
          groups[prodName].push(dept);
        });

        setGroupedDepartments(groups);
        setLegacyDepartments(legacy);
      }
    } catch (error) {
      console.error("Failed to fetch departments", error);
      toast.error("Failed to load department list");
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        name,
        email,
        password,
        department,
        primaryPhone,
      },
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
      toast.success('Signup successful!');
      dispatch(signInSuccess(response.data.user));
      navigate('/'); 
    } catch (error: any) {
      dispatch(signInFailure(error.response?.data?.message || 'Signup failed'));
      toast.error(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details to sign up</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Team</Label>
              <Select value={department} onValueChange={setDepartment} required>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDepts ? "Loading teams..." : "Select your team"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Dynamic Product Groups */}
                  {Object.entries(groupedDepartments).map(([productName, depts]) => (
                    <SelectGroup key={productName}>
                      <SelectLabel>{productName}</SelectLabel>
                      {depts.map((dept) => (
                        <SelectItem key={dept._id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}

                  {/* Legacy Departments (if any) */}
                  {legacyDepartments.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>General / Other</SelectLabel>
                      {legacyDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryPhone">Phone</Label>
              <Input id="primaryPhone" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/signin" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
      {/* <ToastContainer position="top-right" autoClose={3000} /> */}
    </div>
  );
};

export default SignUp;