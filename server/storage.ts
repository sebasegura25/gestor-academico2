import {
  users, careers, subjects, requirements, students, studentSubjects, enrollments,
  type User, type InsertUser, type Career, type InsertCareer,
  type Subject, type InsertSubject, type Requirement, type InsertRequirement,
  type Student, type InsertStudent, type StudentSubject, type InsertStudentSubject,
  type Enrollment, type InsertEnrollment
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // Career management
  getCareers(): Promise<Career[]>;
  getCareer(id: number): Promise<Career | undefined>;
  createCareer(career: InsertCareer): Promise<Career>;
  updateCareer(id: number, career: Partial<Career>): Promise<Career>;
  deleteCareer(id: number): Promise<void>;
  
  // Subject management
  getSubjects(careerId?: number): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjectsByYear(careerId: number, year: number): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<Subject>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;
  
  // Requirements (correlatividades)
  getRequirements(subjectId: number): Promise<Requirement[]>;
  addRequirement(requirement: InsertRequirement): Promise<Requirement>;
  removeRequirement(id: number): Promise<void>;
  
  // Student management
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<Student>): Promise<Student>;
  
  // Student-Subject relationships
  getStudentSubjects(studentId: number): Promise<StudentSubject[]>;
  getStudentSubjectsWithDetails(studentId: number): Promise<any[]>;
  updateStudentSubjectStatus(id: number, status: string, date?: Date): Promise<StudentSubject>;
  addStudentSubject(studentSubject: InsertStudentSubject): Promise<StudentSubject>;
  
  // Enrollments
  getEnrollments(studentId?: number, subjectId?: number): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<void>;
  
  // For authentication
  sessionStore: session.SessionStore;
}

// Memory Storage implementation
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private careersData: Map<number, Career>;
  private subjectsData: Map<number, Subject>;
  private requirementsData: Map<number, Requirement>;
  private studentsData: Map<number, Student>;
  private studentSubjectsData: Map<number, StudentSubject>;
  private enrollmentsData: Map<number, Enrollment>;
  
  private userIdCounter: number;
  private careerIdCounter: number;
  private subjectIdCounter: number;
  private requirementIdCounter: number;
  private studentIdCounter: number;
  private studentSubjectIdCounter: number;
  private enrollmentIdCounter: number;
  
  sessionStore: session.SessionStore;
  
  constructor() {
    this.usersData = new Map();
    this.careersData = new Map();
    this.subjectsData = new Map();
    this.requirementsData = new Map();
    this.studentsData = new Map();
    this.studentSubjectsData = new Map();
    this.enrollmentsData = new Map();
    
    this.userIdCounter = 1;
    this.careerIdCounter = 1;
    this.subjectIdCounter = 1;
    this.requirementIdCounter = 1;
    this.studentIdCounter = 1;
    this.studentSubjectIdCounter = 1;
    this.enrollmentIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some default data after schema is ready
    this.initializeData();
  }
  
  // Initialize some sample data
  private async initializeData() {
    // Create admin user
    await this.createUser({
      username: "admin",
      password: "admin123", // This will be hashed in auth.ts
      fullName: "Admin Usuario",
      email: "admin@instituto.edu",
      role: "admin"
    });
    
    // Create some careers
    const mathCareer = await this.createCareer({
      name: "Prof. Matemática",
      durationYears: 4
    });
    
    const langCareer = await this.createCareer({
      name: "Prof. Lengua",
      durationYears: 4
    });
    
    // Create some subjects for math career
    const algebra = await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT101",
      name: "Álgebra I",
      year: 1,
      hoursCount: 64
    });
    
    await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT102",
      name: "Análisis I",
      year: 1,
      hoursCount: 64
    });
    
    await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT103",
      name: "Geometría I",
      year: 1,
      hoursCount: 64
    });
    
    await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT104",
      name: "Didáctica",
      year: 1,
      hoursCount: 48
    });
    
    await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT105",
      name: "Historia de la Matemática",
      year: 1,
      hoursCount: 48
    });
    
    // Create 2nd year subjects
    const algebra2 = await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT201",
      name: "Álgebra II",
      year: 2,
      hoursCount: 64
    });
    
    const analisis2 = await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT202",
      name: "Análisis II",
      year: 2,
      hoursCount: 64
    });
    
    await this.createSubject({
      careerId: mathCareer.id,
      code: "MAT203",
      name: "Geometría II",
      year: 2,
      hoursCount: 64
    });
    
    // Create requirements
    await this.addRequirement({
      subjectId: algebra2.id,
      requiredSubjectId: algebra.id
    });
    
    await this.addRequirement({
      subjectId: analisis2.id,
      requiredSubjectId: algebra.id
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.usersData.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    const user: User = {
      id,
      ...userData,
      createdAt: now
    };
    
    this.usersData.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...existingUser, ...userData };
    this.usersData.set(id, updatedUser);
    
    return updatedUser;
  }
  
  // Career methods
  async getCareers(): Promise<Career[]> {
    return Array.from(this.careersData.values());
  }
  
  async getCareer(id: number): Promise<Career | undefined> {
    return this.careersData.get(id);
  }
  
  async createCareer(careerData: InsertCareer): Promise<Career> {
    const id = this.careerIdCounter++;
    const now = new Date();
    
    const career: Career = {
      id,
      ...careerData,
      createdAt: now
    };
    
    this.careersData.set(id, career);
    return career;
  }
  
  async updateCareer(id: number, careerData: Partial<Career>): Promise<Career> {
    const existingCareer = await this.getCareer(id);
    if (!existingCareer) {
      throw new Error("Career not found");
    }
    
    const updatedCareer = { ...existingCareer, ...careerData };
    this.careersData.set(id, updatedCareer);
    
    return updatedCareer;
  }
  
  async deleteCareer(id: number): Promise<void> {
    if (!this.careersData.has(id)) {
      throw new Error("Career not found");
    }
    
    this.careersData.delete(id);
  }
  
  // Subject methods
  async getSubjects(careerId?: number): Promise<Subject[]> {
    const subjects = Array.from(this.subjectsData.values());
    
    if (careerId !== undefined) {
      return subjects.filter(subject => subject.careerId === careerId);
    }
    
    return subjects;
  }
  
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjectsData.get(id);
  }
  
  async getSubjectsByYear(careerId: number, year: number): Promise<Subject[]> {
    const subjects = Array.from(this.subjectsData.values());
    return subjects.filter(subject => subject.careerId === careerId && subject.year === year);
  }
  
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const now = new Date();
    
    const subject: Subject = {
      id,
      ...subjectData,
      createdAt: now
    };
    
    this.subjectsData.set(id, subject);
    return subject;
  }
  
  async updateSubject(id: number, subjectData: Partial<Subject>): Promise<Subject> {
    const existingSubject = await this.getSubject(id);
    if (!existingSubject) {
      throw new Error("Subject not found");
    }
    
    const updatedSubject = { ...existingSubject, ...subjectData };
    this.subjectsData.set(id, updatedSubject);
    
    return updatedSubject;
  }
  
  async deleteSubject(id: number): Promise<void> {
    if (!this.subjectsData.has(id)) {
      throw new Error("Subject not found");
    }
    
    this.subjectsData.delete(id);
  }
  
  // Requirements methods
  async getRequirements(subjectId: number): Promise<Requirement[]> {
    const requirements = Array.from(this.requirementsData.values());
    return requirements.filter(req => req.subjectId === subjectId);
  }
  
  async addRequirement(requirementData: InsertRequirement): Promise<Requirement> {
    const id = this.requirementIdCounter++;
    const now = new Date();
    
    const requirement: Requirement = {
      id,
      ...requirementData,
      createdAt: now
    };
    
    this.requirementsData.set(id, requirement);
    return requirement;
  }
  
  async removeRequirement(id: number): Promise<void> {
    if (!this.requirementsData.has(id)) {
      throw new Error("Requirement not found");
    }
    
    this.requirementsData.delete(id);
  }
  
  // Student methods
  async getStudents(): Promise<Student[]> {
    return Array.from(this.studentsData.values());
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    return this.studentsData.get(id);
  }
  
  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    for (const student of this.studentsData.values()) {
      if (student.userId === userId) {
        return student;
      }
    }
    return undefined;
  }
  
  async createStudent(studentData: InsertStudent): Promise<Student> {
    const id = this.studentIdCounter++;
    const now = new Date();
    
    const student: Student = {
      id,
      ...studentData,
      createdAt: now
    };
    
    this.studentsData.set(id, student);
    return student;
  }
  
  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const existingStudent = await this.getStudent(id);
    if (!existingStudent) {
      throw new Error("Student not found");
    }
    
    const updatedStudent = { ...existingStudent, ...studentData };
    this.studentsData.set(id, updatedStudent);
    
    return updatedStudent;
  }
  
  // StudentSubject methods
  async getStudentSubjects(studentId: number): Promise<StudentSubject[]> {
    const studentSubjects = Array.from(this.studentSubjectsData.values());
    return studentSubjects.filter(ss => ss.studentId === studentId);
  }
  
  async getStudentSubjectsWithDetails(studentId: number): Promise<any[]> {
    const studentSubjects = await this.getStudentSubjects(studentId);
    const result = [];
    
    for (const ss of studentSubjects) {
      const subject = await this.getSubject(ss.subjectId);
      if (subject) {
        result.push({
          ...ss,
          subject
        });
      }
    }
    
    return result;
  }
  
  async updateStudentSubjectStatus(
    id: number, 
    status: string, 
    date: Date = new Date()
  ): Promise<StudentSubject> {
    const existingSS = this.studentSubjectsData.get(id);
    if (!existingSS) {
      throw new Error("Student-subject record not found");
    }
    
    const updatedSS: StudentSubject = { ...existingSS, status };
    
    if (status === "regular") {
      updatedSS.regularizedDate = date;
    } else if (status === "acreditada") {
      updatedSS.accreditedDate = date;
    }
    
    this.studentSubjectsData.set(id, updatedSS);
    return updatedSS;
  }
  
  async addStudentSubject(ssData: InsertStudentSubject): Promise<StudentSubject> {
    const id = this.studentSubjectIdCounter++;
    const now = new Date();
    
    const studentSubject: StudentSubject = {
      id,
      ...ssData,
      createdAt: now
    };
    
    this.studentSubjectsData.set(id, studentSubject);
    return studentSubject;
  }
  
  // Enrollment methods
  async getEnrollments(studentId?: number, subjectId?: number): Promise<Enrollment[]> {
    const enrollments = Array.from(this.enrollmentsData.values());
    
    if (studentId !== undefined && subjectId !== undefined) {
      return enrollments.filter(e => e.studentId === studentId && e.subjectId === subjectId);
    } else if (studentId !== undefined) {
      return enrollments.filter(e => e.studentId === studentId);
    } else if (subjectId !== undefined) {
      return enrollments.filter(e => e.subjectId === subjectId);
    }
    
    return enrollments;
  }
  
  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const id = this.enrollmentIdCounter++;
    const now = new Date();
    
    const enrollment: Enrollment = {
      id,
      ...enrollmentData,
      createdAt: now
    };
    
    this.enrollmentsData.set(id, enrollment);
    return enrollment;
  }
  
  async deleteEnrollment(id: number): Promise<void> {
    if (!this.enrollmentsData.has(id)) {
      throw new Error("Enrollment not found");
    }
    
    this.enrollmentsData.delete(id);
  }
}

export const storage = new MemStorage();
