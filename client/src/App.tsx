import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CareerManagement from "@/pages/career-management";
import StudentManagement from "@/pages/student-management";
import StudentRecord from "@/pages/student-record";
import EnrollmentForm from "@/pages/enrollment-form";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
      <Route path="/careers" component={CareerManagement} />
      <Route path="/students" component={StudentManagement} />
      <Route path="/student-record/:id" component={StudentRecord} />
      <Route path="/enrollments" component={EnrollmentForm} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
