import {
  students,
  fees,
  expenses,
  performance,
  classes,
  type Student,
  type InsertStudent,
  type Fee,
  type InsertFee,
  type Expense,
  type InsertExpense,
  type Performance,
  type InsertPerformance,
  type Class,
  type InsertClass,
  type StudentWithFees,
  type DashboardStats,
  type ClassPerformance,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, or, and, lt } from "drizzle-orm";

export interface IStorage {
  // Student operations
  getStudents(): Promise<StudentWithFees[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByRegistryNo(registryNo: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  searchStudents(query: string): Promise<StudentWithFees[]>;
  getStudentsByClass(className: string): Promise<StudentWithFees[]>;

  // Fee operations
  getFees(): Promise<Fee[]>;
  getFee(id: number): Promise<Fee | undefined>;
  getStudentFees(studentId: number): Promise<Fee[]>;
  createFee(fee: InsertFee): Promise<Fee>;
  updateFee(id: number, fee: Partial<InsertFee>): Promise<Fee | undefined>;
  deleteFee(id: number): Promise<boolean>;
  getOverdueFees(): Promise<Fee[]>;
  getPendingFees(): Promise<Fee[]>;

  // Expense operations
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getExpensesByCategory(category: string): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;

  // Performance operations
  getPerformances(): Promise<Performance[]>;
  getPerformance(id: number): Promise<Performance | undefined>;
  getStudentPerformances(studentId: number): Promise<Performance[]>;
  createPerformance(performance: InsertPerformance): Promise<Performance>;
  updatePerformance(id: number, performance: Partial<InsertPerformance>): Promise<Performance | undefined>;
  deletePerformance(id: number): Promise<boolean>;

  // Class operations
  getClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(cls: InsertClass): Promise<Class>;
  updateClass(id: number, cls: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;

  // Dashboard and analytics
  getDashboardStats(): Promise<DashboardStats>;
  getClassPerformances(): Promise<ClassPerformance[]>;
  getRecentActivities(): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private fees: Map<number, Fee>;
  private expenses: Map<number, Expense>;
  private performances: Map<number, Performance>;
  private classes: Map<number, Class>;
  private currentStudentId: number;
  private currentFeeId: number;
  private currentExpenseId: number;
  private currentPerformanceId: number;
  private currentClassId: number;

  constructor() {
    this.students = new Map();
    this.fees = new Map();
    this.expenses = new Map();
    this.performances = new Map();
    this.classes = new Map();
    this.currentStudentId = 1;
    this.currentFeeId = 1;
    this.currentExpenseId = 1;
    this.currentPerformanceId = 1;
    this.currentClassId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample classes
    const sampleClasses = [
      { name: "9-A", standard: 9, section: "A", classTeacher: "Mrs. Sharma", room: "101", capacity: 35 },
      { name: "9-B", standard: 9, section: "B", classTeacher: "Mr. Kumar", room: "102", capacity: 35 },
      { name: "10-A", standard: 10, section: "A", classTeacher: "Mrs. Patel", room: "201", capacity: 40 },
      { name: "10-B", standard: 10, section: "B", classTeacher: "Mr. Singh", room: "202", capacity: 40 },
      { name: "11-A", standard: 11, section: "A", classTeacher: "Dr. Reddy", room: "301", capacity: 30 },
      { name: "12-A", standard: 12, section: "A", classTeacher: "Prof. Gupta", room: "401", capacity: 25 },
    ];

    sampleClasses.forEach(cls => {
      const id = this.currentClassId++;
      this.classes.set(id, { ...cls, id });
    });
  }

  // Student operations
  async getStudents(): Promise<StudentWithFees[]> {
    const studentsArray = Array.from(this.students.values());
    const studentsWithFees = await Promise.all(
      studentsArray.map(async (student) => {
        const studentFees = Array.from(this.fees.values()).filter(fee => fee.studentId === student.id);
        const totalFees = studentFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
        const paidFees = studentFees.reduce((sum, fee) => sum + parseFloat(fee.paidAmount || "0"), 0);
        const pendingFees = totalFees - paidFees;
        
        let feeStatus = "paid";
        if (pendingFees > 0) {
          const overdueFees = studentFees.some(fee => 
            fee.status === "pending" && new Date(fee.dueDate) < new Date()
          );
          feeStatus = overdueFees ? "overdue" : "pending";
        }

        const studentPerformances = Array.from(this.performances.values()).filter(p => p.studentId === student.id);
        const averagePerformance = studentPerformances.length > 0 
          ? studentPerformances.reduce((sum, p) => sum + parseFloat(p.percentage || "0"), 0) / studentPerformances.length
          : 0;

        return {
          ...student,
          totalFees: totalFees.toFixed(2),
          paidFees: paidFees.toFixed(2),
          pendingFees: pendingFees.toFixed(2),
          feeStatus,
          averagePerformance: Math.round(averagePerformance),
        };
      })
    );
    return studentsWithFees;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByRegistryNo(registryNo: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(student => student.registryNo === registryNo);
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentStudentId++;
    const student: Student = {
      ...insertStudent,
      id,
      admissionDate: new Date(),
      dateOfBirth: insertStudent.dateOfBirth ? new Date(insertStudent.dateOfBirth) : null,
    };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: number, updateData: Partial<InsertStudent>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;

    const updatedStudent = { 
      ...student, 
      ...updateData,
      dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : student.dateOfBirth,
    };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  async searchStudents(query: string): Promise<StudentWithFees[]> {
    const allStudents = await this.getStudents();
    const lowercaseQuery = query.toLowerCase();
    return allStudents.filter(student =>
      student.firstName.toLowerCase().includes(lowercaseQuery) ||
      student.lastName.toLowerCase().includes(lowercaseQuery) ||
      student.email.toLowerCase().includes(lowercaseQuery) ||
      student.registryNo.toLowerCase().includes(lowercaseQuery) ||
      student.class.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getStudentsByClass(className: string): Promise<StudentWithFees[]> {
    const allStudents = await this.getStudents();
    return allStudents.filter(student => student.class === className);
  }

  // Fee operations
  async getFees(): Promise<Fee[]> {
    return Array.from(this.fees.values());
  }

  async getFee(id: number): Promise<Fee | undefined> {
    return this.fees.get(id);
  }

  async getStudentFees(studentId: number): Promise<Fee[]> {
    return Array.from(this.fees.values()).filter(fee => fee.studentId === studentId);
  }

  async createFee(insertFee: InsertFee): Promise<Fee> {
    const id = this.currentFeeId++;
    const fee: Fee = {
      ...insertFee,
      id,
      dueDate: new Date(insertFee.dueDate),
      paidDate: insertFee.paidDate ? new Date(insertFee.paidDate) : null,
    };
    this.fees.set(id, fee);
    return fee;
  }

  async updateFee(id: number, updateData: Partial<InsertFee>): Promise<Fee | undefined> {
    const fee = this.fees.get(id);
    if (!fee) return undefined;

    const updatedFee = { 
      ...fee, 
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : fee.dueDate,
      paidDate: updateData.paidDate ? new Date(updateData.paidDate) : fee.paidDate,
    };
    this.fees.set(id, updatedFee);
    return updatedFee;
  }

  async deleteFee(id: number): Promise<boolean> {
    return this.fees.delete(id);
  }

  async getOverdueFees(): Promise<Fee[]> {
    const now = new Date();
    return Array.from(this.fees.values()).filter(fee => 
      fee.status === "pending" && fee.dueDate < now
    );
  }

  async getPendingFees(): Promise<Fee[]> {
    return Array.from(this.fees.values()).filter(fee => 
      fee.status === "pending" || fee.status === "partial"
    );
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expense: Expense = {
      ...insertExpense,
      id,
      date: new Date(insertExpense.date),
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;

    const updatedExpense = { 
      ...expense, 
      ...updateData,
      date: updateData.date ? new Date(updateData.date) : expense.date,
    };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.category === category);
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => 
      expense.date >= startDate && expense.date <= endDate
    );
  }

  // Performance operations
  async getPerformances(): Promise<Performance[]> {
    return Array.from(this.performances.values());
  }

  async getPerformance(id: number): Promise<Performance | undefined> {
    return this.performances.get(id);
  }

  async getStudentPerformances(studentId: number): Promise<Performance[]> {
    return Array.from(this.performances.values()).filter(p => p.studentId === studentId);
  }

  async createPerformance(insertPerformance: InsertPerformance): Promise<Performance> {
    const id = this.currentPerformanceId++;
    const performance: Performance = {
      ...insertPerformance,
      id,
      examDate: insertPerformance.examDate ? new Date(insertPerformance.examDate) : null,
      percentage: ((insertPerformance.obtainedMarks / insertPerformance.maxMarks) * 100).toFixed(2),
    };
    this.performances.set(id, performance);
    return performance;
  }

  async updatePerformance(id: number, updateData: Partial<InsertPerformance>): Promise<Performance | undefined> {
    const performance = this.performances.get(id);
    if (!performance) return undefined;

    const updatedPerformance = { 
      ...performance, 
      ...updateData,
      examDate: updateData.examDate ? new Date(updateData.examDate) : performance.examDate,
    };
    
    if (updateData.obtainedMarks || updateData.maxMarks) {
      const obtained = updateData.obtainedMarks || performance.obtainedMarks;
      const max = updateData.maxMarks || performance.maxMarks;
      updatedPerformance.percentage = ((obtained / max) * 100).toFixed(2);
    }

    this.performances.set(id, updatedPerformance);
    return updatedPerformance;
  }

  async deletePerformance(id: number): Promise<boolean> {
    return this.performances.delete(id);
  }

  // Class operations
  async getClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const id = this.currentClassId++;
    const cls: Class = { ...insertClass, id };
    this.classes.set(id, cls);
    return cls;
  }

  async updateClass(id: number, updateData: Partial<InsertClass>): Promise<Class | undefined> {
    const cls = this.classes.get(id);
    if (!cls) return undefined;

    const updatedClass = { ...cls, ...updateData };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async deleteClass(id: number): Promise<boolean> {
    return this.classes.delete(id);
  }

  // Dashboard and analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const totalStudents = this.students.size;
    const allFees = Array.from(this.fees.values());
    const totalFeeCollection = allFees.reduce((sum, fee) => sum + parseFloat(fee.paidAmount || "0"), 0);
    const totalPendingAmount = allFees.reduce((sum, fee) => {
      const pending = parseFloat(fee.amount) - parseFloat(fee.paidAmount || "0");
      return sum + (pending > 0 ? pending : 0);
    }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyExpenses = Array.from(this.expenses.values())
      .filter(expense => 
        expense.date.getMonth() === currentMonth && expense.date.getFullYear() === currentYear
      )
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const overdueStudents = new Set(
      Array.from(this.fees.values())
        .filter(fee => fee.status === "pending" && fee.dueDate < new Date())
        .map(fee => fee.studentId)
    ).size;

    const allPerformances = Array.from(this.performances.values());
    const averagePerformance = allPerformances.length > 0 
      ? allPerformances.reduce((sum, p) => sum + parseFloat(p.percentage || "0"), 0) / allPerformances.length
      : 0;

    return {
      totalStudents,
      totalFeeCollection: totalFeeCollection.toFixed(2),
      pendingFees: totalPendingAmount.toFixed(2),
      monthlyExpenses: monthlyExpenses.toFixed(2),
      overdueStudents,
      averagePerformance: Math.round(averagePerformance),
    };
  }

  async getClassPerformances(): Promise<ClassPerformance[]> {
    const classes = Array.from(this.classes.values());
    const classPerformances: ClassPerformance[] = [];

    for (const cls of classes) {
      const classStudents = Array.from(this.students.values()).filter(s => s.class === cls.name);
      const studentCount = classStudents.length;

      if (studentCount === 0) {
        classPerformances.push({
          className: cls.name,
          studentCount: 0,
          averagePerformance: 0,
          above90Count: 0,
          below60Count: 0,
        });
        continue;
      }

      let totalPerformance = 0;
      let above90Count = 0;
      let below60Count = 0;

      for (const student of classStudents) {
        const studentPerformances = Array.from(this.performances.values())
          .filter(p => p.studentId === student.id);
        
        if (studentPerformances.length > 0) {
          const avgPerformance = studentPerformances.reduce((sum, p) => 
            sum + parseFloat(p.percentage || "0"), 0) / studentPerformances.length;
          
          totalPerformance += avgPerformance;
          
          if (avgPerformance >= 90) above90Count++;
          if (avgPerformance < 60) below60Count++;
        }
      }

      const averagePerformance = studentCount > 0 ? totalPerformance / studentCount : 0;

      classPerformances.push({
        className: cls.name,
        studentCount,
        averagePerformance: Math.round(averagePerformance),
        above90Count,
        below60Count,
      });
    }

    return classPerformances;
  }

  async getRecentActivities(): Promise<any[]> {
    const recentActivities = [];
    
    // Recent fee payments
    const recentPayments = Array.from(this.fees.values())
      .filter(fee => fee.paidDate && fee.paidDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 5);
    
    for (const payment of recentPayments) {
      const student = this.students.get(payment.studentId);
      if (student) {
        recentActivities.push({
          type: 'payment',
          message: `Fee payment received from ${student.firstName} ${student.lastName}`,
          amount: payment.paidAmount,
          timestamp: payment.paidDate,
        });
      }
    }

    // Recent student admissions
    const recentAdmissions = Array.from(this.students.values())
      .filter(student => student.admissionDate && student.admissionDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 3);

    for (const student of recentAdmissions) {
      recentActivities.push({
        type: 'admission',
        message: `New student enrolled: ${student.firstName} ${student.lastName}`,
        details: student.class,
        timestamp: student.admissionDate,
      });
    }

    // Recent expenses
    const recentExpenses = Array.from(this.expenses.values())
      .filter(expense => expense.date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 3);

    for (const expense of recentExpenses) {
      recentActivities.push({
        type: 'expense',
        message: `Expense recorded: ${expense.description}`,
        amount: expense.amount,
        timestamp: expense.date,
      });
    }

    return recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export class DatabaseStorage implements IStorage {
  async getStudents(): Promise<StudentWithFees[]> {
    const allStudents = await db.select().from(students);
    const allFees = await db.select().from(fees);
    const allPerformances = await db.select().from(performance);

    return allStudents.map(student => {
      const studentFees = allFees.filter(fee => fee.studentId === student.id);
      const totalFees = studentFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
      const paidFees = studentFees.reduce((sum, fee) => sum + parseFloat(fee.paidAmount || "0"), 0);
      const pendingFees = totalFees - paidFees;
      
      let feeStatus = "paid";
      if (pendingFees > 0) {
        const overdueFees = studentFees.some(fee => 
          fee.status === "pending" && new Date(fee.dueDate) < new Date()
        );
        feeStatus = overdueFees ? "overdue" : "pending";
      }

      const studentPerformances = allPerformances.filter(p => p.studentId === student.id);
      const averagePerformance = studentPerformances.length > 0 
        ? studentPerformances.reduce((sum, p) => sum + parseFloat(p.percentage || "0"), 0) / studentPerformances.length
        : 0;

      return {
        ...student,
        totalFees: totalFees.toFixed(2),
        paidFees: paidFees.toFixed(2),
        pendingFees: pendingFees.toFixed(2),
        feeStatus,
        averagePerformance: Math.round(averagePerformance),
      };
    });
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByRegistryNo(registryNo: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.registryNo, registryNo));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values({
        ...insertStudent,
        phone: insertStudent.phone || null,
        address: insertStudent.address || null,
        section: insertStudent.section || null,
        guardianName: insertStudent.guardianName || null,
        guardianPhone: insertStudent.guardianPhone || null,
        status: insertStudent.status || "active",
        dateOfBirth: insertStudent.dateOfBirth ? new Date(insertStudent.dateOfBirth) : null,
      })
      .returning();
    return student;
  }

  async updateStudent(id: number, updateData: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db
      .update(students)
      .set({
        ...updateData,
        phone: updateData.phone || null,
        address: updateData.address || null,
        section: updateData.section || null,
        guardianName: updateData.guardianName || null,
        guardianPhone: updateData.guardianPhone || null,
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
      })
      .where(eq(students.id, id))
      .returning();
    return student || undefined;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id));
    return result.rowCount > 0;
  }

  async searchStudents(query: string): Promise<StudentWithFees[]> {
    const allStudents = await this.getStudents();
    const lowercaseQuery = query.toLowerCase();
    return allStudents.filter(student =>
      student.firstName.toLowerCase().includes(lowercaseQuery) ||
      student.lastName.toLowerCase().includes(lowercaseQuery) ||
      student.email.toLowerCase().includes(lowercaseQuery) ||
      student.registryNo.toLowerCase().includes(lowercaseQuery) ||
      student.class.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getStudentsByClass(className: string): Promise<StudentWithFees[]> {
    const allStudents = await this.getStudents();
    return allStudents.filter(student => student.class === className);
  }

  // Fee operations
  async getFees(): Promise<Fee[]> {
    return await db.select().from(fees);
  }

  async getFee(id: number): Promise<Fee | undefined> {
    const [fee] = await db.select().from(fees).where(eq(fees.id, id));
    return fee || undefined;
  }

  async getStudentFees(studentId: number): Promise<Fee[]> {
    return await db.select().from(fees).where(eq(fees.studentId, studentId));
  }

  async createFee(insertFee: InsertFee): Promise<Fee> {
    const [fee] = await db
      .insert(fees)
      .values({
        ...insertFee,
        status: insertFee.status || "pending",
        paidAmount: insertFee.paidAmount || "0",
        paymentMethod: insertFee.paymentMethod || null,
        transactionId: insertFee.transactionId || null,
        remarks: insertFee.remarks || null,
        dueDate: new Date(insertFee.dueDate),
        paidDate: insertFee.paidDate ? new Date(insertFee.paidDate) : null,
      })
      .returning();
    return fee;
  }

  async updateFee(id: number, updateData: Partial<InsertFee>): Promise<Fee | undefined> {
    const [fee] = await db
      .update(fees)
      .set({
        ...updateData,
        paymentMethod: updateData.paymentMethod || null,
        transactionId: updateData.transactionId || null,
        remarks: updateData.remarks || null,
        dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
        paidDate: updateData.paidDate ? new Date(updateData.paidDate) : undefined,
      })
      .where(eq(fees.id, id))
      .returning();
    return fee || undefined;
  }

  async deleteFee(id: number): Promise<boolean> {
    const result = await db.delete(fees).where(eq(fees.id, id));
    return result.rowCount > 0;
  }

  async getOverdueFees(): Promise<Fee[]> {
    const now = new Date();
    return await db.select().from(fees).where(
      and(
        eq(fees.status, "pending"),
        lt(fees.dueDate, now)
      )
    );
  }

  async getPendingFees(): Promise<Fee[]> {
    return await db.select().from(fees).where(
      or(
        eq(fees.status, "pending"),
        eq(fees.status, "partial")
      )
    );
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values({
        ...insertExpense,
        paymentMethod: insertExpense.paymentMethod || null,
        vendor: insertExpense.vendor || null,
        invoiceNumber: insertExpense.invoiceNumber || null,
        approvedBy: insertExpense.approvedBy || null,
        remarks: insertExpense.remarks || null,
        date: new Date(insertExpense.date),
      })
      .returning();
    return expense;
  }

  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({
        ...updateData,
        paymentMethod: updateData.paymentMethod || null,
        vendor: updateData.vendor || null,
        invoiceNumber: updateData.invoiceNumber || null,
        approvedBy: updateData.approvedBy || null,
        remarks: updateData.remarks || null,
        date: updateData.date ? new Date(updateData.date) : undefined,
      })
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.category, category));
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db.select().from(expenses).where(
      and(
        eq(expenses.date, startDate),
        eq(expenses.date, endDate)
      )
    );
  }

  // Performance operations
  async getPerformances(): Promise<Performance[]> {
    return await db.select().from(performance);
  }

  async getPerformance(id: number): Promise<Performance | undefined> {
    const [perf] = await db.select().from(performance).where(eq(performance.id, id));
    return perf || undefined;
  }

  async getStudentPerformances(studentId: number): Promise<Performance[]> {
    return await db.select().from(performance).where(eq(performance.studentId, studentId));
  }

  async createPerformance(insertPerformance: InsertPerformance): Promise<Performance> {
    const percentage = ((insertPerformance.obtainedMarks / insertPerformance.maxMarks) * 100).toFixed(2);
    
    const [perf] = await db
      .insert(performance)
      .values({
        ...insertPerformance,
        percentage,
        grade: insertPerformance.grade || null,
        remarks: insertPerformance.remarks || null,
        examDate: insertPerformance.examDate ? new Date(insertPerformance.examDate) : null,
      })
      .returning();
    return perf;
  }

  async updatePerformance(id: number, updateData: Partial<InsertPerformance>): Promise<Performance | undefined> {
    let percentage: string | undefined;
    if (updateData.obtainedMarks || updateData.maxMarks) {
      const current = await this.getPerformance(id);
      if (current) {
        const obtained = updateData.obtainedMarks || current.obtainedMarks;
        const max = updateData.maxMarks || current.maxMarks;
        percentage = ((obtained / max) * 100).toFixed(2);
      }
    }

    const [perf] = await db
      .update(performance)
      .set({
        ...updateData,
        percentage: percentage || updateData.percentage,
        grade: updateData.grade || null,
        remarks: updateData.remarks || null,
        examDate: updateData.examDate ? new Date(updateData.examDate) : undefined,
      })
      .where(eq(performance.id, id))
      .returning();
    return perf || undefined;
  }

  async deletePerformance(id: number): Promise<boolean> {
    const result = await db.delete(performance).where(eq(performance.id, id));
    return result.rowCount > 0;
  }

  // Class operations
  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls || undefined;
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const [cls] = await db
      .insert(classes)
      .values({
        ...insertClass,
        classTeacher: insertClass.classTeacher || null,
        room: insertClass.room || null,
        capacity: insertClass.capacity || null,
      })
      .returning();
    return cls;
  }

  async updateClass(id: number, updateData: Partial<InsertClass>): Promise<Class | undefined> {
    const [cls] = await db
      .update(classes)
      .set({
        ...updateData,
        classTeacher: updateData.classTeacher || null,
        room: updateData.room || null,
        capacity: updateData.capacity || null,
      })
      .where(eq(classes.id, id))
      .returning();
    return cls || undefined;
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return result.rowCount > 0;
  }

  // Dashboard and analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const allStudents = await db.select().from(students);
    const allFees = await db.select().from(fees);
    const allExpenses = await db.select().from(expenses);
    const allPerformances = await db.select().from(performance);

    const totalStudents = allStudents.length;
    const totalFeeCollection = allFees.reduce((sum, fee) => sum + parseFloat(fee.paidAmount || "0"), 0);
    const totalPendingAmount = allFees.reduce((sum, fee) => {
      const pending = parseFloat(fee.amount) - parseFloat(fee.paidAmount || "0");
      return sum + (pending > 0 ? pending : 0);
    }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyExpenses = allExpenses
      .filter(expense => 
        expense.date.getMonth() === currentMonth && expense.date.getFullYear() === currentYear
      )
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const overdueStudents = new Set(
      allFees
        .filter(fee => fee.status === "pending" && fee.dueDate < new Date())
        .map(fee => fee.studentId)
    ).size;

    const averagePerformance = allPerformances.length > 0 
      ? allPerformances.reduce((sum, p) => sum + parseFloat(p.percentage || "0"), 0) / allPerformances.length
      : 0;

    return {
      totalStudents,
      totalFeeCollection: totalFeeCollection.toFixed(2),
      pendingFees: totalPendingAmount.toFixed(2),
      monthlyExpenses: monthlyExpenses.toFixed(2),
      overdueStudents,
      averagePerformance: Math.round(averagePerformance),
    };
  }

  async getClassPerformances(): Promise<ClassPerformance[]> {
    const allClasses = await db.select().from(classes);
    const allStudents = await db.select().from(students);
    const allPerformances = await db.select().from(performance);

    return allClasses.map(cls => {
      const classStudents = allStudents.filter(s => s.class === cls.name);
      const studentCount = classStudents.length;

      if (studentCount === 0) {
        return {
          className: cls.name,
          studentCount: 0,
          averagePerformance: 0,
          above90Count: 0,
          below60Count: 0,
        };
      }

      let totalPerformance = 0;
      let above90Count = 0;
      let below60Count = 0;

      for (const student of classStudents) {
        const studentPerformances = allPerformances.filter(p => p.studentId === student.id);
        
        if (studentPerformances.length > 0) {
          const avgPerformance = studentPerformances.reduce((sum, p) => 
            sum + parseFloat(p.percentage || "0"), 0) / studentPerformances.length;
          
          totalPerformance += avgPerformance;
          if (avgPerformance >= 90) above90Count++;
          if (avgPerformance < 60) below60Count++;
        }
      }

      return {
        className: cls.name,
        studentCount,
        averagePerformance: Math.round(totalPerformance / studentCount),
        above90Count,
        below60Count,
      };
    });
  }

  async getRecentActivities(): Promise<any[]> {
    return [];
  }
}

export const storage = new DatabaseStorage();
