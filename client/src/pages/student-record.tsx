import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layouts/sidebar";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Career, Student, StudentSubject } from "@shared/schema";

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

export default function StudentRecord() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedCareer, setSelectedCareer] = useState<number | null>(null);
  
  // Fetch student record
  const { data: studentRecord, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["/api/students", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch student record");
      }
      return response.json() as Promise<StudentRecord>;
    },
    enabled: !isNaN(studentId)
  });
  
  // Fetch student subjects
  const { data: studentSubjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/students", studentId, "subjects"],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}/subjects`);
      if (!response.ok) {
        throw new Error("Failed to fetch student subjects");
      }
      return response.json() as Promise<SubjectWithDetails[]>;
    },
    enabled: !isNaN(studentId)
  });
  
  // Set initial selected career from student record
  useEffect(() => {
    if (studentRecord && studentRecord.career) {
      setSelectedCareer(studentRecord.career.id);
    }
  }, [studentRecord]);
  
  // Calculate academic progress
  const calculateProgress = () => {
    if (!studentSubjects) return { approved: 0, total: 0, percentage: 0, average: 0 };
    
    const approved = studentSubjects.filter(ss => ss.status === "acreditada").length;
    const total = 40; // Assumed total subjects required
    const percentage = Math.round((approved / total) * 100);
    
    // Calculate average grade from approved subjects
    const gradesSum = studentSubjects
      .filter(ss => ss.status === "acreditada" && ss.grade)
      .reduce((sum, ss) => sum + (ss.grade || 0), 0);
    
    const gradesCount = studentSubjects
      .filter(ss => ss.status === "acreditada" && ss.grade)
      .length;
    
    const average = gradesCount > 0 ? parseFloat((gradesSum / gradesCount).toFixed(1)) : 0;
    
    return { approved, total, percentage, average };
  };
  
  // Get subjects for current year
  const getSubjectsForYear = (year: number) => {
    if (!studentSubjects) return [];
    return studentSubjects.filter(ss => ss.subject.year === year);
  };
  
  // Calculate expiry date for Regular status (2 years from regularization date)
  const calculateExpiryDate = (regularizedDate: Date | null) => {
    if (!regularizedDate) return "";
    
    const date = new Date(regularizedDate);
    date.setFullYear(date.getFullYear() + 2);
    
    return date.toLocaleDateString();
  };
  
  const progress = calculateProgress();
  const currentYearSubjects = getSubjectsForYear(selectedYear);
  
  return (
    <>
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">Legajo Estudiantil</h1>
            <p className="text-[#8e8e93]">Información académica completa</p>
          </div>
          
          <div className="flex space-x-2">
            <Select defaultValue={selectedCareer?.toString()} disabled>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Seleccionar carrera" />
              </SelectTrigger>
              <SelectContent>
                {studentRecord && (
                  <SelectItem value={studentRecord.career.id.toString()}>
                    {studentRecord.career.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Button className="bg-[#0070f3] hover:bg-blue-600">
              Imprimir
            </Button>
          </div>
        </div>
        
        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          {isLoadingStudent ? (
            <div className="flex flex-col md:flex-row justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48 mb-1" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-80" />
              </div>
              
              <div className="mt-4 md:mt-0 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-40 mt-2" />
              </div>
            </div>
          ) : studentRecord ? (
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1d1d1f]">{studentRecord.user.fullName}</h2>
                <p className="text-[#8e8e93]">DNI: {studentRecord.documentId} | Legajo: {studentRecord.fileNumber}</p>
                <p className="text-[#8e8e93]">Correo: {studentRecord.user.email}</p>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="text-sm text-[#8e8e93] mb-1">Estado académico</div>
                <StatusBadge variant="regular" label="Regular" />
                <div className="text-[#8e8e93] text-sm mt-2">Año de ingreso: {studentRecord.enrollmentYear}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-[#8e8e93]">
              No se encontró información del estudiante
            </div>
          )}
        </div>
        
        {/* Academic Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">Progreso Académico</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#f5f5f7] rounded-lg p-4">
              <div className="text-sm text-[#8e8e93] mb-1">Materias aprobadas</div>
              <div className="text-xl font-semibold text-[#1d1d1f]">{progress.approved} / {progress.total}</div>
              <div className="w-full bg-[#e5e5ea] rounded-full h-2.5 mt-2">
                <div 
                  className="bg-[#34c759] h-2.5 rounded-full" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-[#f5f5f7] rounded-lg p-4">
              <div className="text-sm text-[#8e8e93] mb-1">Promedio general</div>
              <div className="text-xl font-semibold text-[#1d1d1f]">{progress.average}</div>
              <div className="w-full bg-[#e5e5ea] rounded-full h-2.5 mt-2">
                <div 
                  className="bg-[#0070f3] h-2.5 rounded-full" 
                  style={{ width: `${progress.average * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subjects List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">Historial de Materias</h2>
          
          {/* Year Tabs */}
          <Tabs 
            defaultValue="1" 
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
            className="mb-6"
          >
            <TabsList className="border-b border-[#e5e5ea] mb-6">
              <div className="flex">
                {studentRecord && Array.from({ length: studentRecord.career.durationYears }, (_, i) => i + 1).map((year) => (
                  <TabsTrigger key={year} value={year.toString()} className="px-4 py-2">
                    {year}° Año
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>
            
            {studentRecord && Array.from({ length: studentRecord.career.durationYears }, (_, i) => i + 1).map((year) => (
              <TabsContent key={year} value={year.toString()}>
                {/* Subjects Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-[#f5f5f7] text-[#8e8e93] text-left text-sm">
                        <th className="py-3 px-4 font-medium rounded-l-lg">Código</th>
                        <th className="py-3 px-4 font-medium">Materia</th>
                        <th className="py-3 px-4 font-medium">Estado</th>
                        <th className="py-3 px-4 font-medium">Calificación</th>
                        <th className="py-3 px-4 font-medium rounded-r-lg">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#3a3a3c]">
                      {isLoadingSubjects ? (
                        // Skeleton loaders
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i} className="border-b border-[#e5e5ea]">
                            <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-6 w-24" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-8" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                          </tr>
                        ))
                      ) : currentYearSubjects.length > 0 ? (
                        // Actual subjects
                        currentYearSubjects.map((subjectData) => (
                          <tr key={subjectData.id} className="border-b border-[#e5e5ea]">
                            <td className="py-3 px-4">{subjectData.subject.code}</td>
                            <td className="py-3 px-4">{subjectData.subject.name}</td>
                            <td className="py-3 px-4">
                              <StatusBadge variant={subjectData.status as any} />
                            </td>
                            <td className="py-3 px-4">{subjectData.grade || "-"}</td>
                            <td className="py-3 px-4">
                              {subjectData.status === "acreditada" && subjectData.accreditedDate
                                ? new Date(subjectData.accreditedDate).toLocaleDateString()
                                : subjectData.status === "regular" && subjectData.regularizedDate
                                  ? (
                                    <span className="text-[#ffcc00] text-sm">
                                      Vence: {calculateExpiryDate(subjectData.regularizedDate)}
                                    </span>
                                  )
                                : subjectData.status === "cursando"
                                  ? "En curso"
                                  : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#8e8e93]">
                            No hay materias registradas para este año.
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
      </div>
    </>
  );
}
