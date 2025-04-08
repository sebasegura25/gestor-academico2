import React, { useState, useEffect } from "react";
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
  DialogDescription
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Career, Subject } from "@shared/schema";

// Define Career form schema
const careerFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  durationYears: z.coerce.number().min(1, "La duración debe ser al menos 1 año")
});

// Define Subject form schema
const subjectFormSchema = z.object({
  careerId: z.coerce.number(),
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  year: z.coerce.number().min(1, "El año debe ser al menos 1"),
  hoursCount: z.coerce.number().min(1, "La carga horaria debe ser al menos 1 hora")
});

type CareerFormValues = z.infer<typeof careerFormSchema>;
type SubjectFormValues = z.infer<typeof subjectFormSchema>;

export default function CareerManagement() {
  const { toast } = useToast();
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [openCareerDialog, setOpenCareerDialog] = useState(false);
  const [openSubjectDialog, setOpenSubjectDialog] = useState(false);
  const [careerToDelete, setCareerToDelete] = useState<Career | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Define Career form
  const careerForm = useForm<CareerFormValues>({
    resolver: zodResolver(careerFormSchema),
    defaultValues: {
      name: "",
      durationYears: 4
    }
  });
  
  // Define Subject form
  const subjectForm = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      careerId: 0,
      code: "",
      name: "",
      year: 1,
      hoursCount: 64
    }
  });
  
  // Fetch careers
  const { data: careers, isLoading: isLoadingCareers } = useQuery({
    queryKey: ["/api/careers"],
    queryFn: async () => {
      const response = await fetch("/api/careers");
      if (!response.ok) {
        throw new Error("Failed to fetch careers");
      }
      return response.json() as Promise<Career[]>;
    }
  });
  
  // Create a function to get subject count for a career
  const getSubjectCount = async (careerId: number) => {
    try {
      const response = await fetch(`/api/careers/${careerId}/subject-count`);
      if (!response.ok) {
        return 0;
      }
      const data = await response.json();
      return data.count;
    } catch (error) {
      return 0;
    }
  };
  
  // State to store subject counts
  const [subjectCounts, setSubjectCounts] = useState<Record<number, number>>({});
  
  // Load subject counts for all careers
  useEffect(() => {
    const loadSubjectCounts = async () => {
      if (careers && careers.length > 0) {
        const counts: Record<number, number> = {};
        
        for (const career of careers) {
          counts[career.id] = await getSubjectCount(career.id);
        }
        
        setSubjectCounts(counts);
      }
    };
    
    loadSubjectCounts();
  }, [careers]);
  
  // Fetch subjects for selected career and year
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/careers", selectedCareer?.id, "subjects", "year", selectedYear],
    queryFn: async () => {
      if (!selectedCareer) return [];
      const response = await fetch(`/api/careers/${selectedCareer.id}/subjects/year/${selectedYear}`);
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json() as Promise<Subject[]>;
    },
    enabled: !!selectedCareer
  });
  
  // Create career mutation
  const createCareerMutation = useMutation({
    mutationFn: async (data: CareerFormValues) => {
      const res = await apiRequest("POST", "/api/careers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers"] });
      toast({
        title: "Carrera creada",
        description: "La carrera se ha creado correctamente",
      });
      setOpenCareerDialog(false);
      careerForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear la carrera",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: async (data: SubjectFormValues) => {
      const res = await apiRequest("POST", "/api/subjects", data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar todas las consultas relacionadas con materias
      queryClient.invalidateQueries({ queryKey: ["/api/careers"] });
      
      // Actualizar contador de materias para esta carrera
      setSubjectCounts(prev => ({
        ...prev,
        [variables.careerId]: (prev[variables.careerId] || 0) + 1
      }));
      
      if (selectedCareer) {
        // Invalidar consultas específicas de esta carrera y año
        queryClient.invalidateQueries({
          queryKey: ["/api/careers", selectedCareer.id, "subjects"]
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/careers", selectedCareer.id, "subjects", "year", selectedYear] 
        });
        
        // Invalidar contador de materias
        queryClient.invalidateQueries({
          queryKey: ["/api/careers", selectedCareer.id, "subject-count"]
        });
      }
      
      toast({
        title: "Materia creada",
        description: "La materia se ha creado correctamente",
      });
      setOpenSubjectDialog(false);
      subjectForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear la materia",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      // Invalidar todas las consultas relacionadas con materias
      queryClient.invalidateQueries({ queryKey: ["/api/careers"] });
      
      if (selectedCareer) {
        // Actualizar contador de materias para esta carrera
        setSubjectCounts(prev => ({
          ...prev,
          [selectedCareer.id]: Math.max(0, (prev[selectedCareer.id] || 1) - 1)
        }));
        
        // Invalidar consultas específicas de esta carrera y año
        queryClient.invalidateQueries({
          queryKey: ["/api/careers", selectedCareer.id, "subjects"]
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/careers", selectedCareer.id, "subjects", "year", selectedYear] 
        });
        
        // Invalidar contador de materias
        queryClient.invalidateQueries({
          queryKey: ["/api/careers", selectedCareer.id, "subject-count"]
        });
      }
      
      // Invalidar estadísticas generales
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      toast({
        title: "Materia eliminada",
        description: "La materia se ha eliminado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar la materia",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete career mutation
  const deleteCareerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/careers/${id}`);
    },
    onSuccess: () => {
      // Invalidar todas las consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/careers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      toast({
        title: "Carrera eliminada",
        description: "La carrera se ha eliminado correctamente",
      });
      
      // Reset selection if the deleted career was selected
      if (selectedCareer?.id === careerToDelete?.id) {
        setSelectedCareer(null);
      }
      
      setCareerToDelete(null);
      setOpenDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar la carrera",
        description: error.message,
        variant: "destructive",
      });
      setOpenDeleteDialog(false);
    }
  });
  
  // Handle career form submission
  const onCareerSubmit = (data: CareerFormValues) => {
    createCareerMutation.mutate(data);
  };
  
  // Handle subject form submission
  const onSubjectSubmit = (data: SubjectFormValues) => {
    if (!selectedCareer) return;
    
    const formData = {
      ...data,
      careerId: selectedCareer.id
    };
    
    createSubjectMutation.mutate(formData);
  };
  
  // Handle career selection
  const handleCareerSelect = (career: Career) => {
    setSelectedCareer(career);
    setSelectedYear(1);
    
    // Update subject form with careerId
    subjectForm.setValue("careerId", career.id);
  };
  
  return (
    <>
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">Gestión de Carreras</h1>
            <p className="text-[#8e8e93]">Administración de planes de estudio</p>
          </div>
          
          <Dialog open={openCareerDialog} onOpenChange={setOpenCareerDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#0070f3] text-white hover:bg-blue-600">
                Nueva carrera
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Carrera</DialogTitle>
              </DialogHeader>
              
              <Form {...careerForm}>
                <form onSubmit={careerForm.handleSubmit(onCareerSubmit)} className="space-y-4">
                  <FormField
                    control={careerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Carrera</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Prof. Matemática" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={careerForm.control}
                    name="durationYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración (años)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenCareerDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#0070f3] hover:bg-blue-600"
                      disabled={createCareerMutation.isPending}
                    >
                      {createCareerMutation.isPending ? "Creando..." : "Crear Carrera"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Career Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {isLoadingCareers ? (
            // Skeleton loaders
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-20 mb-4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))
          ) : careers && careers.length > 0 ? (
            // Actual careers
            careers.map((career) => (
              <div 
                key={career.id} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                  selectedCareer?.id === career.id ? "border-[#0070f3]" : "border-transparent"
                }`}
              >
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">{career.name}</h2>
                  <p className="text-[#8e8e93] mt-1">Duración: {career.durationYears} años</p>
                  <p className="text-[#8e8e93]">{subjectCounts[career.id] || 0} materias</p>
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCareerSelect(career)}
                    >
                      Ver plan
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500"
                      onClick={() => {
                        setCareerToDelete(career);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-[#8e8e93]">
              No hay carreras disponibles. Crea una nueva carrera para comenzar.
            </div>
          )}
        </div>
        
        {/* Selected Career Plan */}
        {selectedCareer && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Plan de Estudios: {selectedCareer.name}
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Editar plan
                </Button>
                <Button variant="outline" size="sm">
                  Exportar PDF
                </Button>
              </div>
            </div>
            
            {/* Year Tabs */}
            <Tabs 
              defaultValue="1" 
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              className="mb-6"
            >
              <TabsList className="mb-4 flex overflow-x-auto">
                {Array.from({ length: selectedCareer.durationYears }, (_, i) => i + 1).map((year) => (
                  <TabsTrigger key={year} value={year.toString()} className="px-4 py-2 whitespace-nowrap">
                    {year}° Año
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Array.from({ length: selectedCareer.durationYears }, (_, i) => i + 1).map((year) => (
                <TabsContent key={year} value={year.toString()}>
                  {/* Subjects Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-[#f5f5f7] text-[#8e8e93] text-left text-sm">
                          <th className="py-3 px-4 font-medium rounded-l-lg">Código</th>
                          <th className="py-3 px-4 font-medium">Materia</th>
                          <th className="py-3 px-4 font-medium">Carga horaria</th>
                          <th className="py-3 px-4 font-medium">Correlativas</th>
                          <th className="py-3 px-4 font-medium rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#3a3a3c]">
                        {isLoadingSubjects ? (
                          // Skeleton loaders
                          Array(3).fill(0).map((_, i) => (
                            <tr key={i} className="border-b border-[#e5e5ea]">
                              <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                            </tr>
                          ))
                        ) : subjects && subjects.length > 0 ? (
                          // Actual subjects
                          subjects.map((subject) => (
                            <tr key={subject.id} className="border-b border-[#e5e5ea]">
                              <td className="py-3 px-4">{subject.code}</td>
                              <td className="py-3 px-4">{subject.name}</td>
                              <td className="py-3 px-4">{subject.hoursCount} hs</td>
                              <td className="py-3 px-4">-</td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <Button variant="link" className="text-[#0070f3] text-sm p-0 h-auto">
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="link" 
                                    className="text-[#ff3b30] text-sm p-0 h-auto"
                                    onClick={() => deleteSubjectMutation.mutate(subject.id)}
                                    disabled={deleteSubjectMutation.isPending}
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#8e8e93]">
                              No hay materias para este año. Agrega una nueva materia para comenzar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <Dialog open={openSubjectDialog} onOpenChange={setOpenSubjectDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Agregar materia
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar Nueva Materia</DialogTitle>
                        </DialogHeader>
                        
                        <Form {...subjectForm}>
                          <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
                            <FormField
                              control={subjectForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Código</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: MAT101" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={subjectForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: Álgebra I" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={subjectForm.control}
                              name="year"
                              render={({ field }) => {
                                // Actualizar el valor del campo con el año seleccionado
                                React.useEffect(() => {
                                  field.onChange(selectedYear);
                                }, [selectedYear]);
                                
                                return (
                                  <FormItem>
                                    <FormLabel>Año</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        max={selectedCareer.durationYears} 
                                        readOnly
                                        value={selectedYear}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                            
                            <FormField
                              control={subjectForm.control}
                              name="hoursCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Carga Horaria (hs)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(parseInt(e.target.value));
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setOpenSubjectDialog(false)}>
                                Cancelar
                              </Button>
                              <Button 
                                type="submit" 
                                className="bg-[#0070f3] hover:bg-blue-600"
                                disabled={createSubjectMutation.isPending}
                              >
                                {createSubjectMutation.isPending ? "Agregando..." : "Agregar Materia"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </div>
      
      {/* AlertDialog for career deletion confirmation */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar carrera?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no puede deshacerse. Se eliminará la carrera y todas sus materias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteCareerMutation.mutate(careerToDelete?.id!)}
              disabled={deleteCareerMutation.isPending}
            >
              {deleteCareerMutation.isPending ? "Eliminando..." : "Eliminar carrera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
