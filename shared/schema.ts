import { pgTable, text, serial, integer, timestamp, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("estudiante"), // "admin", "docente", "estudiante", "pendiente"
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const careers = pgTable("careers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  durationYears: integer("duration_years").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  careerId: integer("career_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  hoursCount: integer("hours_count").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  requiredSubjectId: integer("required_subject_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  careerId: integer("career_id").notNull(),
  fileNumber: text("file_number").notNull().unique(),
  enrollmentDate: timestamp("enrollment_date").notNull(),
  status: text("status").notNull().default("active"), // "active", "inactive", "graduated"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentSubjects = pgTable("student_subjects", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  status: text("status").notNull(), // "cursando", "acreditada", "libre"
  grade: integer("grade"),
  date: timestamp("date"), // Fecha de acreditación
  book: text("book"), // Libro donde está registrada la nota
  folio: text("folio"), // Folio donde está registrada la nota
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  type: text("type").notNull(), // "cursada", "examen"
  examDate: timestamp("exam_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});

export const insertCareerSchema = createInsertSchema(careers).pick({
  name: true,
  durationYears: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  careerId: true,
  code: true,
  name: true,
  year: true,
  hoursCount: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).pick({
  subjectId: true,
  requiredSubjectId: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  userId: true,
  careerId: true,
  fileNumber: true,
  enrollmentDate: true,
  status: true,
});

export const insertStudentSubjectSchema = createInsertSchema(studentSubjects).pick({
  studentId: true,
  subjectId: true,
  status: true,
  grade: true,
  date: true,
  book: true,
  folio: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).pick({
  studentId: true,
  subjectId: true,
  type: true,
  examDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCareer = z.infer<typeof insertCareerSchema>;
export type Career = typeof careers.$inferSelect;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Requirement = typeof requirements.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertStudentSubject = z.infer<typeof insertStudentSubjectSchema>;
export type StudentSubject = typeof studentSubjects.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
