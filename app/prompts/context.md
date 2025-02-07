### **📜 Context for AI to Generate Specific Questions on Student Activity in Neo4j**

#### **Introduction**
This database models student activity in an online academy, tracking **student purchases, course progress, and sales transactions**. The database is structured in **Neo4j**, a graph database, where relationships define the connections between students, courses, and their activities.

---

### **📌 Database Structure & Rules**
The system follows strict rules to ensure data consistency and accuracy:

#### **📍 Entities & Relationships**
- **Student (:Student)**
  - Represents a student enrolled in the academy.
  - Has attributes: `id`, `name`, `email`, `phone`.

- **Course (:Course)**
  - Represents an available course.
  - Has attributes: `name`, `url`.

- **Progress (:PROGRESS)**
  - Tracks a student's progress in a course.
  - Relationship: `(s:Student)-[:PROGRESS]->(c:Course)`.
  - Has attributes: `progress` (integer from 0 to 100).

- **Sales (:PURCHASED)**
  - Represents a student's purchase or refund of a course.
  - Relationship: `(s:Student)-[:PURCHASED]->(c:Course)`.
  - Has attributes: `status` ("paid" or "refunded"), `paymentMethod` ("pix" or "credit_card"), `paymentDate`, `amount`.

---

### **✅ Business Rules (Data Integrity Constraints)**
1. **A student can only have progress in a course they purchased.**
   - A `PROGRESS` relationship can only exist if there is a `PURCHASED` relationship where `status = "paid"`.

2. **A student can only have one progress entry per course.**
   - If a `PROGRESS` relationship already exists, the `progress` value is updated instead of creating a new relationship.

3. **A student can only purchase or refund a course once.**
   - A `PURCHASED` relationship can only exist once per `(Student, Course)`. If a new status is set, the existing record is updated.

---

### **📌 Cypher Queries Mapping the Rules**

#### **1️⃣ Verify if a Student Exists**
```cypher
MATCH (s:Student) RETURN s LIMIT 5;
```

#### **2️⃣ Verify Student's Course Progress (Must Have Purchased the Course)**
```cypher
MATCH (s:Student)-[:PURCHASED {status: "paid"}]->(c:Course)
OPTIONAL MATCH (s)-[p:PROGRESS]->(c)
RETURN s.name AS Student, c.name AS Course, p.progress AS Progress;
```

#### **3️⃣ Ensure a Student Can Only Buy or Refund a Course Once**
```cypher
MATCH (s:Student)-[p:PURCHASED]->(c:Course)
RETURN s.name, c.name, p.status, p.paymentMethod, p.paymentDate, p.amount;
```

#### **4️⃣ Find Students Who Have Progress Without Purchase (Invalid Case)**
```cypher
MATCH (s:Student)-[p:PROGRESS]->(c:Course)
WHERE NOT EXISTS {
    MATCH (s)-[:PURCHASED {status: "paid"}]->(c)
}
RETURN s.name AS Student, c.name AS Course, p.progress AS Progress;
```

#### **5️⃣ Find Students Who Bought but Never Started a Course**
```cypher
MATCH (s:Student)-[:PURCHASED {status: "paid"}]->(c:Course)
WHERE NOT (s)-[:PROGRESS]->(c)
RETURN s.name AS Student, c.name AS Course;
```

---

### **🚀 AI Question Examples Based on This Context**

#### ✅ **Valid Scenarios**
1. "Which students have purchased a course and started their progress?"
2. "What is the average progress of students who purchased 'Mastering Node.js Streams'?"
3. "List all students who completed a course (progress = 100%)."

#### ❌ **Edge Cases & Invalid Data Detection**
4. "Are there students with progress in a course they never bought?"
5. "Has any student purchased a course multiple times?"
6. "Which students purchased a course but never started it?"

---

### **🎯 Summary**
- **Neo4j is used to track student activity** in the academy.
- **Graph relationships enforce business rules** for purchases and progress.
- **Data integrity constraints prevent inconsistencies**.
- **AI-generated questions should respect these rules** and help detect invalid cases.