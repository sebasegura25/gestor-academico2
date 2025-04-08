import { Sidebar } from "@/components/layouts/sidebar";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, CheckIcon, ClockIcon, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

type Statistic = {
  id: string;
  label: string;
  value: number;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  info?: string;
};

type Activity = {
  id: string;
  icon: "plus" | "check" | "clock";
  iconBgColor: string;
  actorName: string;
  action: string;
  objectName: string;
  timestamp: string;
};

type Exam = {
  id: string;
  subject: string;
  career: string;
  date: string;
  classroom: string;
};

export default function HomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // If auth is still loading, show a loading spinner
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // If there's no user, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/statistics"],
    queryFn: async () => {
      const response = await fetch("/api/statistics");
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }
      return response.json();
    },
  });
  
  // Format statistics for display
  const formattedStats: Statistic[] = !isLoadingStats && stats ? [
    {
      id: "students",
      label: "Estudiantes",
      value: stats.studentCount,
      change: {
        value: "12% más que el período anterior",
        type: "increase"
      }
    },
    {
      id: "careers",
      label: "Carreras",
      value: stats.careerCount,
      info: `${Math.floor(stats.careerCount / 2)} carreras nuevas este año`
    },
    {
      id: "subjects",
      label: "Materias",
      value: stats.subjectCount,
      info: `Distribuidas en ${stats.careerCount} carreras`
    },
    {
      id: "enrollments",
      label: "Inscripciones activas",
      value: stats.activeEnrollmentCount,
      change: {
        value: "5% menos que el período anterior",
        type: "decrease"
      }
    }
  ] : [];
  
  // Mock data for activities and exams since we don't have these endpoints yet
  const activities: Activity[] = [
    {
      id: "1",
      icon: "plus",
      iconBgColor: "#0070f3",
      actorName: "Maria González",
      action: "se inscribió en",
      objectName: "Análisis Matemático II",
      timestamp: "Hace 35 minutos"
    },
    {
      id: "2",
      icon: "check",
      iconBgColor: "#34c759",
      actorName: "Prof. Martínez",
      action: "actualizó las notas de",
      objectName: "Álgebra I",
      timestamp: "Hace 2 horas"
    },
    {
      id: "3",
      icon: "clock",
      iconBgColor: "#ffcc00",
      actorName: "Admin",
      action: "publicó nuevo período de inscripciones",
      objectName: "",
      timestamp: "Hace 5 horas"
    }
  ];
  
  const exams: Exam[] = [
    {
      id: "1",
      subject: "Álgebra I",
      career: "Prof. Matemática",
      date: "15 Nov 2023",
      classroom: "Aula 104"
    },
    {
      id: "2",
      subject: "Análisis II",
      career: "Prof. Matemática",
      date: "18 Nov 2023",
      classroom: "Aula 203"
    },
    {
      id: "3",
      subject: "Gramática",
      career: "Prof. Lengua",
      date: "22 Nov 2023",
      classroom: "Aula 108"
    }
  ];
  
  // Helper function to render activity icon
  const renderActivityIcon = (icon: Activity["icon"], bgColor: string) => {
    const iconMap = {
      plus: <PlusIcon className="h-4 w-4" />,
      check: <CheckIcon className="h-4 w-4" />,
      clock: <ClockIcon className="h-4 w-4" />
    };
    
    return (
      <div 
        className="h-8 w-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        {iconMap[icon]}
      </div>
    );
  };
  
  return (
    <>
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Dashboard</h1>
          <p className="text-[#8e8e93]">Bienvenido/a {user?.fullName} al sistema de gestión académica</p>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoadingStats ? (
            // Skeleton loaders
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32 mt-2" />
              </div>
            ))
          ) : (
            // Actual stats
            formattedStats.map((stat) => (
              <div key={stat.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-[#8e8e93] mb-1">{stat.label}</div>
                <div className="text-2xl font-semibold text-[#1d1d1f]">{stat.value}</div>
                
                {stat.change ? (
                  <div 
                    className={`text-sm mt-2 flex items-center ${
                      stat.change.type === "increase" ? "text-[#34c759]" : 
                      stat.change.type === "decrease" ? "text-[#ff3b30]" : 
                      "text-[#8e8e93]"
                    }`}
                  >
                    {stat.change.type === "increase" ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                    ) : stat.change.type === "decrease" ? (
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                    ) : null}
                    {stat.change.value}
                  </div>
                ) : stat.info ? (
                  <div className="text-[#0070f3] text-sm mt-2">
                    {stat.info}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        
        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">Actividad Reciente</h2>
          
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start pb-4 border-b border-[#e5e5ea]">
                {renderActivityIcon(activity.icon, activity.iconBgColor)}
                <div className="ml-3">
                  <p className="text-[#3a3a3c]">
                    <span className="font-medium">{activity.actorName}</span>
                    {" "}{activity.action}{" "}
                    {activity.objectName && <span className="font-medium">{activity.objectName}</span>}
                  </p>
                  <p className="text-[#8e8e93] text-sm">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" className="text-[#0070f3] text-sm font-medium">
              Ver todas las actividades
            </Button>
          </div>
        </div>
        
        {/* Upcoming Exams Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">Próximos Exámenes</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#f5f5f7] text-[#8e8e93] text-left text-sm">
                  <th className="py-3 px-4 font-medium rounded-l-lg">Materia</th>
                  <th className="py-3 px-4 font-medium">Carrera</th>
                  <th className="py-3 px-4 font-medium">Fecha</th>
                  <th className="py-3 px-4 font-medium">Aula</th>
                  <th className="py-3 px-4 font-medium rounded-r-lg">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-[#3a3a3c]">
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-b border-[#e5e5ea]">
                    <td className="py-3 px-4">{exam.subject}</td>
                    <td className="py-3 px-4">{exam.career}</td>
                    <td className="py-3 px-4">{exam.date}</td>
                    <td className="py-3 px-4">{exam.classroom}</td>
                    <td className="py-3 px-4">
                      <Button variant="link" className="text-[#0070f3] hover:underline text-sm font-medium">
                        Ver detalles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
