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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Career, Student, Subject, StudentSubject } from "@shared/schema";
import { useRoute, Link } from "wouter";

// Define our types
type StudentRecord = Student & {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    role: string;
  };
  career: Career;
};

type SubjectWithDetails = StudentSubject & {
  subject: {
    id: number;
    code: string;
    name: string;
    year: number;
    hoursCount: number;
  };
};

// Define StudentSubject update schema
const studentSubjectSchema = z.object({
  id: z.coerce.number().optional(),
  studentId: z.coerce.number(),
  subjectId: z.coerce.number(),
  status: z.enum(["cursando", "acreditada", "libre"]),
  grade: z.union([
    z.coerce.number().min(4, "La nota debe ser al menos 4").max(10, "La nota máxima es 10"),
    z.literal("").transform(() => null),
    z.null()
  ]).optional(),
  date: z.union([
    z.string().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]).optional(),
  book: z.union([
    z.string().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]).optional(),
  folio: z.union([
    z.string().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]).optional()
});

type StudentSubjectFormValues = z.infer<typeof studentSubjectSchema>;

export default function StudentRecord() {
  const { toast } = useToast();
  const [, params] = useRoute('/student-record/:id');
  const studentId = params?.id ? parseInt(params.id) : 0;
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [openSubjectDialog, setOpenSubjectDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithDetails | null>(null);
  
  // Define StudentSubject form
  const subjectForm = useForm<StudentSubjectFormValues>({
    resolver: zodResolver(studentSubjectSchema),
    defaultValues: {
      studentId: studentId,
      subjectId: 0,
      status: "libre"
    }
  });
  
  // Fetch student details
  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["/api/students", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch student");
      }
      return response.json() as Promise<StudentRecord>;
    },
    enabled: !!studentId
  });
  
  // Fetch student's subjects with details
  const { data: studentSubjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/students", studentId, "subjects"],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}/subjects`);
      if (!response.ok) {
        throw new Error("Failed to fetch student subjects");
      }
      return response.json() as Promise<SubjectWithDetails[]>;
    },
    enabled: !!studentId
  });
  
  // Fetch all subjects for this career (to find ones the student hasn't enrolled in yet)
  const { data: careerSubjects, isLoading: isLoadingCareerSubjects } = useQuery({
    queryKey: ["/api/careers", student?.careerId, "subjects"],
    queryFn: async () => {
      if (!student?.careerId) return [];
      try {
        console.log("Fetching subjects for career:", student.careerId);
        // Usar getSubjects en lugar de la ruta específica de carrera
        const response = await fetch(`/api/subjects?careerId=${student.careerId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch career subjects: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Received subjects:", data);
        return data as Subject[];
      } catch (error) {
        console.error("Error fetching career subjects:", error);
        return [];  // Retornar arreglo vacío para evitar errores en el componente
      }
    },
    enabled: !!student?.careerId
  });
  
  // Get all career subjects for the selected year
  const yearSubjects = careerSubjects?.filter(
    (subject) => subject.year === selectedYear
  ) || [];
  
  // Get subjects for selected year that the student is already enrolled in
  const filteredSubjects = studentSubjects?.filter(
    (ss) => ss.subject.year === selectedYear
  ) || [];
  
  // Create a map of enrolled subjects by subjectId
  const enrolledSubjectsMap = new Map();
  filteredSubjects.forEach(ss => {
    enrolledSubjectsMap.set(ss.subjectId, ss);
  });
  
  // Update or create student subject status mutation
  const updateSubjectStatusMutation = useMutation({
    mutationFn: async (data: StudentSubjectFormValues) => {
      // If this is an update (we have an ID)
      if (data.id) {
        const res = await apiRequest("PATCH", `/api/student-subjects/${data.id}`, data);
        return await res.json();
      } 
      // This is a new enrollment
      else {
        const res = await apiRequest("POST", "/api/student-subjects", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/students", studentId, "subjects"] });
      
      toast({
        title: "Estado de materia actualizado",
        description: "El estado de la materia se ha actualizado correctamente",
      });
      setOpenSubjectDialog(false);
      setSelectedSubject(null);
      subjectForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el estado de la materia",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubjectSubmit = (data: StudentSubjectFormValues) => {
    updateSubjectStatusMutation.mutate(data);
  };
  
  // Effect to reset form when we select a different subject
  useEffect(() => {
    if (selectedSubject) {
      subjectForm.reset({
        id: selectedSubject.id,
        studentId: selectedSubject.studentId,
        subjectId: selectedSubject.subjectId,
        status: selectedSubject.status as any,
        // Fix tipo datos para campos opcionales/nulos usando null explícitamente
        grade: selectedSubject.grade ? (selectedSubject.grade as number) : null,
        date: selectedSubject.date ? new Date(selectedSubject.date).toISOString().split('T')[0] : null,
        book: selectedSubject.book || null,
        folio: selectedSubject.folio || null
      });
    } else {
      subjectForm.reset({
        studentId: studentId,
        subjectId: 0,
        status: "libre",
        grade: null,
        date: null,
        book: null,
        folio: null
      });
    }
  }, [selectedSubject, studentId]);
  
  // Get status text and style in Spanish
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "cursando": 
        return { 
          text: "Cursando", 
          bgColor: "bg-yellow-100", 
          textColor: "text-yellow-800" 
        };
      case "acreditada": 
        return { 
          text: "Acreditada", 
          bgColor: "bg-green-100", 
          textColor: "text-green-800" 
        };
      case "libre": 
        return { 
          text: "Libre", 
          bgColor: "bg-gray-100", 
          textColor: "text-gray-800" 
        };
      default: 
        return { 
          text: status, 
          bgColor: "bg-gray-100", 
          textColor: "text-gray-800" 
        };
    }
  };
  
  // Get available subjects that student hasn't enrolled in yet
  const getAvailableSubjects = () => {
    if (!careerSubjects || !studentSubjects) return [];
    
    // Get IDs of subjects student is already enrolled in
    const enrolledSubjectIds = new Set(studentSubjects.map(ss => ss.subjectId));
    
    // Filter out subjects already enrolled
    return careerSubjects.filter(subject => !enrolledSubjectIds.has(subject.id));
  };
  
  if (!studentId) {
    return (
      <>
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-[#1d1d1f] mb-4">No se encontró el estudiante</h2>
            <p className="text-[#8e8e93] mb-6">No se ha proporcionado un ID de estudiante válido.</p>
            <Link to="/student-management">
              <Button>Volver a la lista de estudiantes</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="text-sm text-[#0070f3] hover:underline mb-2 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">Legajo Estudiantil</h1>
            <p className="text-[#8e8e93]">Seguimiento académico y estado de materias</p>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => {
              // Refrescar todas las consultas relacionadas
              queryClient.invalidateQueries({ queryKey: ["/api/students", studentId] });
              queryClient.invalidateQueries({ queryKey: ["/api/students", studentId, "subjects"] });
              queryClient.invalidateQueries({ queryKey: ["/api/careers", student?.careerId, "subjects"] });
              
              toast({
                title: "Datos actualizados",
                description: "El legajo se ha actualizado correctamente",
              });
            }}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar legajo
          </Button>
        </div>
        
        {/* Student Info Card */}
        {isLoadingStudent ? (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-7 w-48" />
              </div>
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-7 w-48" />
              </div>
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-7 w-48" />
              </div>
            </div>
          </div>
        ) : student ? (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-[#8e8e93]">Información personal</p>
                <h2 className="text-xl font-semibold text-[#1d1d1f]">{student.user.fullName}</h2>
                <p className="text-[#3a3a3c]">{student.user.email}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-[#8e8e93]">Información académica</p>
                <h3 className="text-lg font-medium text-[#1d1d1f]">{student.career.name}</h3>
                <p className="text-[#3a3a3c]">Legajo: {student.fileNumber}</p>
                <p className="text-[#3a3a3c]">
                  Inscripción: {new Date(student.enrollmentDate).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-[#8e8e93]">Estado</p>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                    student.status === 'active' ? 'bg-green-100 text-green-800' : 
                    student.status === 'graduated' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {student.status === 'active' ? 'Activo' : 
                     student.status === 'graduated' ? 'Graduado' : 
                     student.status === 'inactive' ? 'Inactivo' : student.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-[#1d1d1f] mb-4">No se encontró el estudiante</h2>
            <p className="text-[#8e8e93] mb-6">
              El estudiante con ID {studentId} no existe o ha sido eliminado.
            </p>
            <Link to="/student-management">
              <Button>Volver a la lista de estudiantes</Button>
            </Link>
          </div>
        )}
        
        {/* Academic Record Tabs - Show only if student exists */}
        {student && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Historial Académico
              </h2>
              
              <Dialog open={openSubjectDialog} onOpenChange={setOpenSubjectDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedSubject ? 
                        "Actualizar Estado de Materia" : 
                        careerSubjects?.find(s => s.id === subjectForm.getValues("subjectId"))?.name ? 
                          `Inscribir en ${careerSubjects?.find(s => s.id === subjectForm.getValues("subjectId"))?.name}` : 
                          "Agregar Materia"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...subjectForm}>
                    <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
                      {!selectedSubject && subjectForm.getValues("subjectId") === 0 && (
                        <FormField
                          control={subjectForm.control}
                          name="subjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Materia</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una materia" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {getAvailableSubjects().map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id.toString()}>
                                      {subject.code} - {subject.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {!selectedSubject && subjectForm.getValues("subjectId") !== 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-[#8e8e93] mb-1">Materia:</p>
                          <p className="font-medium">
                            {careerSubjects?.find(s => s.id === subjectForm.getValues("subjectId"))?.name || "Materia seleccionada"}
                          </p>
                        </div>
                      )}
                      
                      <FormField
                        control={subjectForm.control}
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
                                <SelectItem value="libre">Libre</SelectItem>
                                <SelectItem value="cursando">Cursando</SelectItem>
                                <SelectItem value="acreditada">Acreditada</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {subjectForm.watch("status") === "acreditada" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={subjectForm.control}
                              name="grade"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nota</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="4" 
                                      max="10" 
                                      step="1"
                                      value={field.value === null || field.value === undefined ? "" : field.value}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value ? parseInt(value) : "");
                                      }}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={subjectForm.control}
                              name="date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      value={field.value === null || field.value === undefined ? "" : field.value}
                                      onChange={(e) => field.onChange(e.target.value || "")}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={subjectForm.control}
                              name="book"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Libro</FormLabel>
                                  <FormControl>
                                    <Input 
                                      value={field.value === null || field.value === undefined ? "" : field.value}
                                      onChange={(e) => field.onChange(e.target.value || "")}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={subjectForm.control}
                              name="folio"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Folio</FormLabel>
                                  <FormControl>
                                    <Input 
                                      value={field.value === null || field.value === undefined ? "" : field.value}
                                      onChange={(e) => field.onChange(e.target.value || "")}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}
                      
                      <DialogFooter className="mt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setOpenSubjectDialog(false);
                            setSelectedSubject(null);
                            subjectForm.reset();
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-[#0070f3] hover:bg-blue-600"
                          disabled={updateSubjectStatusMutation.isPending}
                        >
                          {updateSubjectStatusMutation.isPending ? "Guardando..." : 
                            selectedSubject ? "Actualizar estado" : "Inscribir materia"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Year Tabs */}
            <Tabs 
              defaultValue="1" 
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              className="mb-6"
            >
              <TabsList className="mb-4 flex overflow-x-auto">
                {Array.from({ length: student.career.durationYears }, (_, i) => i + 1).map((year) => (
                  <TabsTrigger key={year} value={year.toString()} className="px-4 py-2 whitespace-nowrap">
                    {year}° Año
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Array.from({ length: student.career.durationYears }, (_, i) => i + 1).map((year) => (
                <TabsContent key={year} value={year.toString()}>
                  {/* Subjects Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-[#f5f5f7] text-[#8e8e93] text-left text-sm">
                          <th className="py-3 px-4 font-medium rounded-l-lg">Código</th>
                          <th className="py-3 px-4 font-medium">Materia</th>
                          <th className="py-3 px-4 font-medium">Estado</th>
                          <th className="py-3 px-4 font-medium">Nota</th>
                          <th className="py-3 px-4 font-medium">Fecha</th>
                          <th className="py-3 px-4 font-medium">Libro</th>
                          <th className="py-3 px-4 font-medium">Folio</th>
                          <th className="py-3 px-4 font-medium rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#3a3a3c]">
                        {isLoadingSubjects || isLoadingCareerSubjects ? (
                          // Skeleton loaders
                          Array(3).fill(0).map((_, i) => (
                            <tr key={i} className="border-b border-[#e5e5ea]">
                              <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                            </tr>
                          ))
                        ) : yearSubjects && yearSubjects.length > 0 ? (
                          // Show all career subjects for this year
                          yearSubjects.map((subject) => {
                            // Check if student is enrolled in this subject
                            const studentSubject = enrolledSubjectsMap.get(subject.id);
                            const isEnrolled = !!studentSubject;
                            
                            // Get status details based on enrollment
                            const status = isEnrolled 
                              ? getStatusDetails(studentSubject.status)
                              : { text: "No Inscripto", bgColor: "bg-gray-100", textColor: "text-gray-800" };
                            
                            return (
                              <tr key={subject.id} className="border-b border-[#e5e5ea]">
                                <td className="py-3 px-4">{subject.code}</td>
                                <td className="py-3 px-4">{subject.name}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.textColor}`}>
                                    {status.text}
                                  </span>
                                </td>
                                <td className="py-3 px-4">{isEnrolled ? (studentSubject.grade || "-") : "-"}</td>
                                <td className="py-3 px-4">
                                  {isEnrolled && studentSubject.date 
                                    ? new Date(studentSubject.date).toLocaleDateString() 
                                    : "-"}
                                </td>
                                <td className="py-3 px-4">{isEnrolled ? (studentSubject.book || "-") : "-"}</td>
                                <td className="py-3 px-4">{isEnrolled ? (studentSubject.folio || "-") : "-"}</td>
                                <td className="py-3 px-4">
                                  <Button 
                                    variant="link" 
                                    className="text-[#0070f3] text-sm p-0 h-auto"
                                    onClick={() => {
                                      if (isEnrolled) {
                                        // Edit existing enrollment
                                        setSelectedSubject(studentSubject);
                                      } else {
                                        // Create new enrollment with default values
                                        setSelectedSubject(null);
                                        subjectForm.reset({
                                          studentId: studentId,
                                          subjectId: subject.id,
                                          status: "libre"
                                        });
                                      }
                                      setOpenSubjectDialog(true);
                                    }}
                                  >
                                    {isEnrolled ? "Actualizar" : "Inscribir"}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-[#8e8e93]">
                              No hay materias configuradas para este año en esta carrera.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}