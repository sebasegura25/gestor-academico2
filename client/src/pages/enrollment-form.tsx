import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckIcon, XIcon } from "lucide-react";
import { Career, Student, Subject } from "@shared/schema";

// Define enrollment form schema
const enrollmentFormSchema = z.object({
  studentId: z.string().min(1, "El estudiante es requerido"),
  type: z.string().min(1, "El tipo de inscripción es requerido"),
  careerId: z.string().min(1, "La carrera es requerida"),
  subjectId: z.string().min(1, "La materia es requerida"),
  examDate: z.string().optional(),
});

type EnrollmentFormValues = z.infer<typeof enrollmentFormSchema>;

// Type definitions for API responses
type StudentWithDetails = Student & {
  user: {
    id: number;
    username: string;
    fullName: string;
  };
};

type RequirementWithSubject = {
  id: number;
  subjectId: number;
  requiredSubjectId: number;
  requiredSubject: Subject;
};

export default function EnrollmentForm() {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [requirementsStatus, setRequirementsStatus] = useState<Record<number, boolean>>({});
  const [allRequirementsFulfilled, setAllRequirementsFulfilled] = useState(true);

  // Initialize form
  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      studentId: "",
      type: "cursada",
      careerId: "",
      subjectId: "",
      examDate: "",
    },
  });

  // Watch form values
  const watchStudentId = form.watch("studentId");
  const watchType = form.watch("type");
  const watchCareerId = form.watch("careerId");
  const watchSubjectId = form.watch("subjectId");

  // Fetch students
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const response = await fetch("/api/students");
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json() as Promise<StudentWithDetails[]>;
    },
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
    },
  });

  // Fetch subjects for selected career
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects", { careerId: watchCareerId }],
    queryFn: async () => {
      const response = await fetch(`/api/subjects?careerId=${watchCareerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json() as Promise<Subject[]>;
    },
    enabled: !!watchCareerId,
  });

  // Fetch requirements for selected subject
  const { data: requirements, isLoading: isLoadingRequirements } = useQuery({
    queryKey: ["/api/subjects", watchSubjectId, "requirements"],
    queryFn: async () => {
      const response = await fetch(`/api/subjects/${watchSubjectId}/requirements`);
      if (!response.ok) {
        throw new Error("Failed to fetch requirements");
      }
      return response.json() as Promise<RequirementWithSubject[]>;
    },
    enabled: !!watchSubjectId,
  });

  // Fetch student subjects to check requirements
  const { data: studentSubjects } = useQuery({
    queryKey: ["/api/students", watchStudentId, "subjects"],
    queryFn: async () => {
      const response = await fetch(`/api/students/${watchStudentId}/subjects`);
      if (!response.ok) {
        throw new Error("Failed to fetch student subjects");
      }
      return response.json();
    },
    enabled: !!watchStudentId && !!watchSubjectId,
  });

  // Create enrollment mutation
  const createEnrollmentMutation = useMutation({
    mutationFn: async (data: {
      studentId: number;
      subjectId: number;
      type: string;
      examDate?: string;
    }) => {
      const res = await apiRequest("POST", "/api/enrollments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({
        title: "Inscripción exitosa",
        description: "La inscripción se ha registrado correctamente",
      });
      form.reset();
      setSelectedStudent(null);
      setSelectedCareer(null);
      setSelectedSubject(null);
      setRequirementsStatus({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la inscripción",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if student has completed subject requirements
  useEffect(() => {
    if (requirements && studentSubjects && watchStudentId) {
      const statusMap: Record<number, boolean> = {};
      let allFulfilled = true;

      requirements.forEach((req) => {
        const hasCompleted = studentSubjects.some(
          (ss: any) =>
            ss.subjectId === req.requiredSubjectId &&
            (ss.status === "acreditada" || ss.status === "regular")
        );
        statusMap[req.requiredSubjectId] = hasCompleted;
        if (!hasCompleted) allFulfilled = false;
      });

      setRequirementsStatus(statusMap);
      setAllRequirementsFulfilled(allFulfilled);
    }
  }, [requirements, studentSubjects, watchStudentId]);

  // Handle form submission
  const onSubmit = (formData: EnrollmentFormValues) => {
    if (!allRequirementsFulfilled) {
      toast({
        title: "Error en la inscripción",
        description: "No se cumplen los requisitos de correlatividades",
        variant: "destructive",
      });
      return;
    }

    const data = {
      studentId: parseInt(formData.studentId),
      subjectId: parseInt(formData.subjectId),
      type: formData.type,
      examDate: formData.type === "examen" ? formData.examDate : undefined,
    };

    createEnrollmentMutation.mutate(data);
  };

  // Update selected values when form changes
  useEffect(() => {
    setSelectedStudent(watchStudentId);
  }, [watchStudentId]);

  useEffect(() => {
    setSelectedCareer(watchCareerId);
  }, [watchCareerId]);

  useEffect(() => {
    setSelectedSubject(watchSubjectId);
  }, [watchSubjectId]);

  return (
    <>
      <Sidebar />

      <div className="md:ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Inscripción a Cursada/Examen</h1>
          <p className="text-[#8e8e93]">Complete el formulario para registrar una nueva inscripción</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estudiante</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estudiante" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingStudents ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full mb-2" />
                              <Skeleton className="h-5 w-full mb-2" />
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            students?.map((student) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.user.fullName} (Legajo: {student.fileNumber})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de inscripción</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo de inscripción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cursada">Cursada</SelectItem>
                          <SelectItem value="examen">Examen Final</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="careerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrera</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una carrera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCareers ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full mb-2" />
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            careers?.map((career) => (
                              <SelectItem key={career.id} value={career.id.toString()}>
                                {career.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materia</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchCareerId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una materia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSubjects ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full mb-2" />
                              <Skeleton className="h-5 w-full mb-2" />
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : !watchCareerId ? (
                            <div className="p-2 text-[#8e8e93] text-sm">
                              Seleccione una carrera primero
                            </div>
                          ) : (
                            subjects?.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id.toString()}>
                                {subject.code} - {subject.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Prerequisites Check */}
              {watchStudentId && watchSubjectId && requirements && requirements.length > 0 && (
                <div className="bg-[#f5f5f7] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-[#3a3a3c] mb-2">Correlatividades</h3>

                  <div className="space-y-2">
                    {isLoadingRequirements ? (
                      Array(2).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center">
                          <Skeleton className="h-5 w-5 mr-2" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                      ))
                    ) : (
                      requirements.map((req) => (
                        <div key={req.id} className="flex items-center">
                          {requirementsStatus[req.requiredSubjectId] ? (
                            <CheckIcon className="h-5 w-5 text-[#34c759] mr-2" />
                          ) : (
                            <XIcon className="h-5 w-5 text-[#ff3b30] mr-2" />
                          )}
                          <span
                            className={`text-sm ${
                              requirementsStatus[req.requiredSubjectId]
                                ? "text-[#3a3a3c]"
                                : "text-[#ff3b30]"
                            }`}
                          >
                            {req.requiredSubject.code} - {req.requiredSubject.name}
                            {requirementsStatus[req.requiredSubjectId]
                              ? " (Acreditada)"
                              : " (No acreditada)"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {!allRequirementsFulfilled && (
                    <div className="mt-3 text-sm text-[#ff3b30]">
                      No se puede proceder con la inscripción. Falta acreditar materias correlativas.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className={`${
                    !allRequirementsFulfilled
                      ? "bg-[#d1d1d6] text-[#8e8e93] cursor-not-allowed"
                      : "bg-[#0070f3] hover:bg-blue-600 text-white"
                  }`}
                  disabled={!allRequirementsFulfilled || createEnrollmentMutation.isPending}
                >
                  {createEnrollmentMutation.isPending
                    ? "Procesando..."
                    : "Confirmar inscripción"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
