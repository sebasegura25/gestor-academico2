import { 
  User, InsertUser, 
  Career, InsertCareer, 
  Subject, InsertSubject, 
  Requirement, InsertRequirement,
  Student, InsertStudent,
  StudentSubject, InsertStudentSubject,
  Enrollment, InsertEnrollment
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  users, 
  careers, 
  subjects, 
  requirements, 
  students, 
  studentSubjects, 
  enrollments 
} from "@shared/schema";
import { hashPassword } from "./auth-utils.js";

const PostgresSessionStore = connectPg(session);

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
  updateStudentSubject(id: number, data: {
    status?: string;
    grade?: number | null;
    date?: Date | null;
    book?: string | null;
    folio?: string | null;
  }): Promise<StudentSubject>;
  addStudentSubject(studentSubject: InsertStudentSubject): Promise<StudentSubject>;
  
  // Enrollments
  getEnrollments(studentId?: number, subjectId?: number): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<void>;
  
  // For authentication
  sessionStore: any; // Store instance for session management
  
  // Additional method to initialize admin user
  initializeAdminUser(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  async initializeAdminUser(): Promise<void> {
    // Check if admin user already exists
    const existingAdmin = await this.getUserByUsername("admin");
    
    if (!existingAdmin) {
      // Hash the password
      const hashedPassword = await hashPassword("qwerty");
      
      // Create admin user if it doesn't exist
      await this.createUser({
        username: "admin",
        password: hashedPassword,
        fullName: "Administrador",
        email: "admin@institutogestor.edu",
        role: "admin"
      });
      console.log("Admin user created with username 'admin' and password 'qwerty'");
    }
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({...userData, updatedAt: new Date()})
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return user;
  }
  
  async getCareers(): Promise<Career[]> {
    return db.select().from(careers).orderBy(careers.name);
  }
  
  async getCareer(id: number): Promise<Career | undefined> {
    const [career] = await db.select().from(careers).where(eq(careers.id, id));
    return career;
  }
  
  async createCareer(careerData: InsertCareer): Promise<Career> {
    const [career] = await db.insert(careers).values(careerData).returning();
    return career;
  }
  
  async updateCareer(id: number, careerData: Partial<Career>): Promise<Career> {
    const [career] = await db
      .update(careers)
      .set({...careerData, updatedAt: new Date()})
      .where(eq(careers.id, id))
      .returning();
    
    if (!career) {
      throw new Error(`Career with id ${id} not found`);
    }
    
    return career;
  }
  
  async deleteCareer(id: number): Promise<void> {
    // First delete all subjects associated with this career
    const careerSubjects = await this.getSubjects(id);
    for (const subject of careerSubjects) {
      await this.deleteSubject(subject.id);
    }
    
    // Then delete the career
    await db.delete(careers).where(eq(careers.id, id));
  }
  
  async getSubjects(careerId?: number): Promise<Subject[]> {
    if (careerId !== undefined) {
      return db.select().from(subjects).where(eq(subjects.careerId, careerId)).orderBy(subjects.year);
    }
    return db.select().from(subjects).orderBy(subjects.careerId);
  }
  
  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }
  
  async getSubjectsByYear(careerId: number, year: number): Promise<Subject[]> {
    return db
      .select()
      .from(subjects)
      .where(and(
        eq(subjects.careerId, careerId),
        eq(subjects.year, year)
      ))
      .orderBy(subjects.name);
  }
  
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const [subject] = await db.insert(subjects).values(subjectData).returning();
    return subject;
  }
  
  async updateSubject(id: number, subjectData: Partial<Subject>): Promise<Subject> {
    const [subject] = await db
      .update(subjects)
      .set({...subjectData, updatedAt: new Date()})
      .where(eq(subjects.id, id))
      .returning();
    
    if (!subject) {
      throw new Error(`Subject with id ${id} not found`);
    }
    
    return subject;
  }
  
  async deleteSubject(id: number): Promise<void> {
    // First delete all requirements associated with this subject
    await db.delete(requirements).where(
      sql`${requirements.subjectId} = ${id} OR ${requirements.requiredSubjectId} = ${id}`
    );
    
    // Then delete the subject
    await db.delete(subjects).where(eq(subjects.id, id));
  }
  
  async getRequirements(subjectId: number): Promise<Requirement[]> {
    return db.select().from(requirements).where(eq(requirements.subjectId, subjectId));
  }
  
  async addRequirement(requirementData: InsertRequirement): Promise<Requirement> {
    const [requirement] = await db.insert(requirements).values(requirementData).returning();
    return requirement;
  }
  
  async removeRequirement(id: number): Promise<void> {
    await db.delete(requirements).where(eq(requirements.id, id));
  }
  
  async getStudents(): Promise<Student[]> {
    return db.select().from(students);
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }
  
  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student;
  }
  
  async createStudent(studentData: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(studentData).returning();
    return student;
  }
  
  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const [student] = await db
      .update(students)
      .set({...studentData, updatedAt: new Date()})
      .where(eq(students.id, id))
      .returning();
    
    if (!student) {
      throw new Error(`Student with id ${id} not found`);
    }
    
    return student;
  }
  
  async getStudentSubjects(studentId: number): Promise<StudentSubject[]> {
    return db.select().from(studentSubjects).where(eq(studentSubjects.studentId, studentId));
  }
  
  async getStudentSubjectsWithDetails(studentId: number): Promise<any[]> {
    const studentSubjectsData = await this.getStudentSubjects(studentId);
    
    const result = [];
    for (const ss of studentSubjectsData) {
      const subject = await this.getSubject(ss.subjectId);
      result.push({
        ...ss,
        subject
      });
    }
    
    return result;
  }
  
  async updateStudentSubjectStatus(
    id: number,
    status: string,
    date: Date = new Date()
  ): Promise<StudentSubject> {
    // Esta función se mantiene por compatibilidad con código existente
    return this.updateStudentSubject(id, { status, date });
  }
  
  async updateStudentSubject(
    id: number,
    data: {
      status?: string;
      grade?: number | null;
      date?: Date | null;
      book?: string | null;
      folio?: string | null;
    }
  ): Promise<StudentSubject> {
    const updateData: any = {};
    
    // Copiar solo los campos que están definidos
    if (data.status !== undefined) updateData.status = data.status;
    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.book !== undefined) updateData.book = data.book;
    if (data.folio !== undefined) updateData.folio = data.folio;
    
    const [studentSubject] = await db
      .update(studentSubjects)
      .set(updateData)
      .where(eq(studentSubjects.id, id))
      .returning();
    
    if (!studentSubject) {
      throw new Error(`StudentSubject with id ${id} not found`);
    }
    
    return studentSubject;
  }
  
  async addStudentSubject(ssData: InsertStudentSubject): Promise<StudentSubject> {
    const [studentSubject] = await db.insert(studentSubjects).values(ssData).returning();
    return studentSubject;
  }
  
  async getEnrollments(studentId?: number, subjectId?: number): Promise<Enrollment[]> {
    let conditions = [];
    
    if (studentId !== undefined) {
      conditions.push(eq(enrollments.studentId, studentId));
    }
    
    if (subjectId !== undefined) {
      conditions.push(eq(enrollments.subjectId, subjectId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(enrollments).where(and(...conditions));
    }
    
    return db.select().from(enrollments);
  }
  
  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(enrollments).values(enrollmentData).returning();
    return enrollment;
  }
  
  async deleteEnrollment(id: number): Promise<void> {
    await db.delete(enrollments).where(eq(enrollments.id, id));
  }
}

export const storage = new DatabaseStorage();