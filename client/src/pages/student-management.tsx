import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Career, Student } from "@shared/schema";
import { Link } from "wouter";

// Define Student form schema
const studentFormSchema = z.object({
  userId: z.coerce.number().optional(),
  careerId: z.coerce.number().min(1, "La carrera es requerida"),
  fileNumber: z.string().min(1, "El número de legajo es requerido"),
  enrollmentDate: z.string().min(1, "La fecha de inscripción es requerida"),
  status: z.enum(["active", "inactive", "graduated"]).default("active"),
  username: z.string().min(1, "El nombre de usuario es requerido"),
  fullName: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("El email no es válido").min(1, "El email es requerido"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres")
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

// Define StudentWithUser type for the table display
type StudentWithUser = Student & {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
  };
  career: {
    id: number;
    name: string;
  };
};

export default function StudentManagement() {
  const { toast } = useToast();
  const [openStudentDialog, setOpenStudentDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Define Student form
  const studentForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      careerId: 0,
      fileNumber: "",
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: "active",
      username: "",
      fullName: "",
      email: "",
      password: ""
    }
  });
  
  // Fetch students with user and career details
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students/with-details"],
    queryFn: async () => {
      const response = await fetch("/api/students/with-details");
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json() as Promise<StudentWithUser[]>;
    }
  });
  
  // Fetch careers for the dropdown
  const { data: careers } = useQuery({
    queryKey: ["/api/careers"],
    queryFn: async () => {
      const response = await fetch("/api/careers");
      if (!response.ok) {
        throw new Error("Failed to fetch careers");
      }
      return response.json() as Promise<Career[]>;
    }
  });
  
  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      const res = await apiRequest("POST", "/api/students", data);
      return await res.json();
    },
    onSuccess: () => {
      // Actualizar la caché de React Query
      queryClient.invalidateQueries({ queryKey: ["/api/students/with-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      toast({
        title: "Estudiante creado",
        description: "El estudiante se ha creado correctamente",
      });
      setOpenStudentDialog(false);
      studentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el estudiante",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/students/${id}`);
    },
    onSuccess: () => {
      // Invalidar todas las consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/students/with-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      toast({
        title: "Estudiante eliminado",
        description: "El estudiante se ha eliminado correctamente",
      });
      
      setStudentToDelete(null);
      setOpenDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar el estudiante",
        description: error.message,
        variant: "destructive",
      });
      setOpenDeleteDialog(false);
    }
  });
  
  // Handle student form submission
  const onStudentSubmit = (data: StudentFormValues) => {
    createStudentMutation.mutate(data);
  };
  
  // Function to get status text in Spanish
  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Activo";
      case "inactive": return "Inactivo";
      case "graduated": return "Graduado";
      default: return status;
    }
  };
  
  return (
    <>
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">Gestión de Estudiantes</h1>
            <p className="text-[#8e8e93]">Administración de legajos y seguimiento académico</p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => {
                // Refrescar todas las consultas relacionadas
                queryClient.invalidateQueries({ queryKey: ["/api/students/with-details"] });
                queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
                
                toast({
                  title: "Datos actualizados",
                  description: "La lista de estudiantes se ha actualizado",
                });
              }}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar datos
            </Button>
            
            <Dialog open={openStudentDialog} onOpenChange={setOpenStudentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0070f3] text-white hover:bg-blue-600">
                  Nuevo estudiante
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Estudiante</DialogTitle>
                </DialogHeader>
                
                <Form {...studentForm}>
                  <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={studentForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: juanperez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@ejemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={studentForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Contraseña" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="fileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de legajo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: 2023-1234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={studentForm.control}
                        name="enrollmentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de inscripción</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="careerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carrera</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una carrera" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {careers?.map((career) => (
                                  <SelectItem key={career.id} value={career.id.toString()}>
                                    {career.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={studentForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select 
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="inactive">Inactivo</SelectItem>
                                <SelectItem value="graduated">Graduado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setOpenStudentDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-[#0070f3] hover:bg-blue-600"
                        disabled={createStudentMutation.isPending}
                      >
                        {createStudentMutation.isPending ? "Creando..." : "Crear Estudiante"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f5f7] text-[#8e8e93] text-left text-sm">
                  <th className="py-3 px-4 font-medium">Legajo</th>
                  <th className="py-3 px-4 font-medium">Nombre</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Carrera</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium">Fecha inscripción</th>
                  <th className="py-3 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-[#3a3a3c]">
                {isLoadingStudents ? (
                  // Skeleton loaders
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-[#e5e5ea]">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                    </tr>
                  ))
                ) : students && students.length > 0 ? (
                  // Actual students
                  students.map((student) => (
                    <tr key={student.id} className="border-b border-[#e5e5ea]">
                      <td className="py-3 px-4">{student.fileNumber}</td>
                      <td className="py-3 px-4">{student.user.fullName}</td>
                      <td className="py-3 px-4">{student.user.email}</td>
                      <td className="py-3 px-4">{student.career.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          student.status === 'active' ? 'bg-green-100 text-green-800' : 
                          student.status === 'graduated' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusText(student.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(student.enrollmentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link to={`/student-record/${student.id}`}>
                            <Button variant="link" className="text-[#0070f3] text-sm p-0 h-auto">
                              Ver legajo
                            </Button>
                          </Link>
                          <Button 
                            variant="link" 
                            className="text-[#ff3b30] text-sm p-0 h-auto"
                            onClick={() => {
                              setStudentToDelete(student);
                              setOpenDeleteDialog(true);
                            }}
                            disabled={deleteStudentMutation.isPending}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#8e8e93]">
                      No hay estudiantes registrados. Crea un nuevo estudiante para comenzar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* AlertDialog for student deletion confirmation */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no puede deshacerse. Se eliminará el estudiante y todo su historial académico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteStudentMutation.mutate(studentToDelete?.id!)}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? "Eliminando..." : "Eliminar estudiante"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}