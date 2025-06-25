import { pgTable, text, serial, integer, decimal, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  registryNo: varchar("registry_no", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 15 }),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  class: varchar("class", { length: 20 }).notNull(),
  section: varchar("section", { length: 10 }),
  admissionDate: timestamp("admission_date").defaultNow(),
  guardianName: varchar("guardian_name", { length: 100 }),
  guardianPhone: varchar("guardian_phone", { length: 15 }),
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, graduated
});

export const fees = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  academicYear: varchar("academic_year", { length: 10 }).notNull(),
  feeType: varchar("fee_type", { length: 50 }).notNull(), // tuition, transport, hostel, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, overdue, partial
  paymentMethod: varchar("payment_method", { length: 30 }), // cash, card, bank_transfer, upi
  transactionId: varchar("transaction_id", { length: 100 }),
  remarks: text("remarks"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // salary, maintenance, supplies, utilities, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }),
  vendor: varchar("vendor", { length: 100 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  remarks: text("remarks"),
});

export const performance = pgTable("performance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subject: varchar("subject", { length: 50 }).notNull(),
  examType: varchar("exam_type", { length: 30 }).notNull(), // midterm, final, unit_test, assignment
  academicYear: varchar("academic_year", { length: 10 }).notNull(),
  term: varchar("term", { length: 20 }).notNull(), // first_term, second_term, annual
  maxMarks: integer("max_marks").notNull(),
  obtainedMarks: integer("obtained_marks").notNull(),
  grade: varchar("grade", { length: 5 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  examDate: timestamp("exam_date"),
  remarks: text("remarks"),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(), // 9-A, 10-B, etc.
  standard: integer("standard").notNull(), // 9, 10, 11, 12
  section: varchar("section", { length: 10 }).notNull(),
  classTeacher: varchar("class_teacher", { length: 100 }),
  room: varchar("room", { length: 20 }),
  capacity: integer("capacity").default(40),
});

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  admissionDate: true,
}).extend({
  dateOfBirth: z.string().optional(),
});

export const insertFeeSchema = createInsertSchema(fees).omit({
  id: true,
}).extend({
  dueDate: z.string(),
  paidDate: z.string().optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
}).extend({
  date: z.string(),
});

export const insertPerformanceSchema = createInsertSchema(performance).omit({
  id: true,
}).extend({
  examDate: z.string().optional(),
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
});

// Types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Fee = typeof fees.$inferSelect;
export type InsertFee = z.infer<typeof insertFeeSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Performance = typeof performance.$inferSelect;
export type InsertPerformance = z.infer<typeof insertPerformanceSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

// Extended types for API responses
export type StudentWithFees = Student & {
  totalFees: string;
  paidFees: string;
  pendingFees: string;
  feeStatus: string;
  averagePerformance: number;
};

export type DashboardStats = {
  totalStudents: number;
  totalFeeCollection: string;
  pendingFees: string;
  monthlyExpenses: string;
  overdueStudents: number;
  averagePerformance: number;
};

export type ClassPerformance = {
  className: string;
  studentCount: number;
  averagePerformance: number;
  above90Count: number;
  below60Count: number;
};
