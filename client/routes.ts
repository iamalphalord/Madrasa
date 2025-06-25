import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertFeeSchema, insertExpenseSchema, insertPerformanceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Student routes
  app.get("/api/students", async (req, res) => {
    try {
      const { search, class: className } = req.query;
      
      let students;
      if (search) {
        students = await storage.searchStudents(search as string);
      } else if (className) {
        students = await storage.getStudentsByClass(className as string);
      } else {
        students = await storage.getStudents();
      }
      
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getStudent(id);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      
      // Check if registry number already exists
      const existingStudent = await storage.getStudentByRegistryNo(studentData.registryNo);
      if (existingStudent) {
        return res.status(400).json({ message: "Registry number already exists" });
      }
      
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertStudentSchema.partial().parse(req.body);
      
      const student = await storage.updateStudent(id, updateData);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStudent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Fee routes
  app.get("/api/fees", async (req, res) => {
    try {
      const { student_id, status } = req.query;
      
      let fees;
      if (student_id) {
        fees = await storage.getStudentFees(parseInt(student_id as string));
      } else if (status === "overdue") {
        fees = await storage.getOverdueFees();
      } else if (status === "pending") {
        fees = await storage.getPendingFees();
      } else {
        fees = await storage.getFees();
      }
      
      res.json(fees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fees" });
    }
  });

  app.post("/api/fees", async (req, res) => {
    try {
      const feeData = insertFeeSchema.parse(req.body);
      const fee = await storage.createFee(feeData);
      res.status(201).json(fee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fee" });
    }
  });

  app.put("/api/fees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertFeeSchema.partial().parse(req.body);
      
      const fee = await storage.updateFee(id, updateData);
      if (!fee) {
        return res.status(404).json({ message: "Fee record not found" });
      }
      
      res.json(fee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update fee" });
    }
  });

  app.delete("/api/fees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFee(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Fee record not found" });
      }
      
      res.json({ message: "Fee record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete fee record" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const { category, start_date, end_date } = req.query;
      
      let expenses;
      if (category) {
        expenses = await storage.getExpensesByCategory(category as string);
      } else if (start_date && end_date) {
        expenses = await storage.getExpensesByDateRange(
          new Date(start_date as string),
          new Date(end_date as string)
        );
      } else {
        expenses = await storage.getExpenses();
      }
      
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertExpenseSchema.partial().parse(req.body);
      
      const expense = await storage.updateExpense(id, updateData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Performance routes
  app.get("/api/performances", async (req, res) => {
    try {
      const { student_id } = req.query;
      
      let performances;
      if (student_id) {
        performances = await storage.getStudentPerformances(parseInt(student_id as string));
      } else {
        performances = await storage.getPerformances();
      }
      
      res.json(performances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performances" });
    }
  });

  app.post("/api/performances", async (req, res) => {
    try {
      const performanceData = insertPerformanceSchema.parse(req.body);
      const performance = await storage.createPerformance(performanceData);
      res.status(201).json(performance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid performance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create performance record" });
    }
  });

  app.put("/api/performances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertPerformanceSchema.partial().parse(req.body);
      
      const performance = await storage.updatePerformance(id, updateData);
      if (!performance) {
        return res.status(404).json({ message: "Performance record not found" });
      }
      
      res.json(performance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid performance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update performance record" });
    }
  });

  app.delete("/api/performances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePerformance(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Performance record not found" });
      }
      
      res.json({ message: "Performance record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete performance record" });
    }
  });

  // Class routes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/class-performances", async (req, res) => {
    try {
      const classPerformances = await storage.getClassPerformances();
      res.json(classPerformances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch class performances" });
    }
  });

  app.get("/api/dashboard/recent-activities", async (req, res) => {
    try {
      const activities = await storage.getRecentActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
