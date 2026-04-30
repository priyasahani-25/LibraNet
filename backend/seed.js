const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const Book        = require('./models/Book');
const Member      = require('./models/Member');
const Transaction = require('./models/Transaction');
const { Fine, Supplier, PurchaseOrder } = require('./models/OtherModels');

const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear all collections
  await Promise.all([
    Book.deleteMany(), Member.deleteMany(), Transaction.deleteMany(),
    Fine.deleteMany(), Supplier.deleteMany(), PurchaseOrder.deleteMany(),
  ]);
  console.log('🗑  Cleared existing data');

// --- MEMBERS ---------------------------------------
    const memberData = [
      {
        name: 'Sanjay Mishra', email: 'librarian@libranet.com',
        password: 'librarian123', memberType: 'staff',
        department: 'Library', role: 'librarian',
        phone: '9876543210',
      },
      {
        name: 'Ravi Kumar', email: 'ravi@student.com',
        password: 'student123', memberType: 'student',
        department: 'CSE', rollNo: 'CSE2021001',
        phone: '9123456780',
      },
      {
        name: 'Priya Dash', email: 'priya@student.com',
        password: 'student123', memberType: 'student',
        department: 'ECE', rollNo: 'ECE2021015',
        phone: '9123456781',
      },
      {
        name: 'Sneha Patel', email: 'sneha@student.com',
        password: 'student123', memberType: 'student',
        department: 'IT', rollNo: 'IT2022003',
        phone: '9123456782',
      },
      {
        name: 'Amit Nayak', email: 'amit@student.com',
        password: 'student123', memberType: 'student',
        department: 'MECH', rollNo: 'MECH2021022',
        phone: '9123456783',
      },
      {
        name: 'Neha Sahani', email: 'neha@student.com',
        password: 'neha@123', memberType: 'student',
        department: 'CSE', rollNo: 'CSE2023010',
        phone: '9123456790',
      },
      {
        name: 'Prof. Subash Roy', email: 'subash@staff.com',
        password: 'staff123', memberType: 'staff',
        department: 'Physics', role: 'member',
        phone: '9876501234',
      }
    ];

    // Loop to trigger the pre('save') hooks sequentially
    const members = [];
    for (const m of memberData) {
      members.push(await Member.create(m));
    }
    console.log(`👥 Created ${members.length} members`);

// --- BOOKS -----------------------------------------
    const bookData = [
      { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest', isbn: '978-0-262-04630-5', subject: 'Computer Science', publisher: 'MIT Press', totalCopies: 8 },
      { title: 'Database System Concepts', author: 'Silberschatz, Korth', isbn: '978-0-07-352332-3', subject: 'Databases', publisher: 'McGraw-Hill', totalCopies: 5 },
      { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '978-1-119-32091-3', subject: 'Systems', publisher: 'Wiley', totalCopies: 6 },
      { title: 'Computer Networks', author: 'Andrew Tanenbaum', isbn: '978-0-13-212695-3', subject: 'Networking', publisher: 'Pearson', totalCopies: 4 },
      { title: 'Discrete Mathematics', author: 'Kenneth Rosen', isbn: '978-0-07-338309-5', subject: 'Mathematics', publisher: 'McGraw-Hill', totalCopies: 10 },
      { title: 'Engineering Mathematics', author: 'B.S. Grewal', isbn: '978-8-12-740522-1', subject: 'Mathematics', publisher: 'Khanna', totalCopies: 12 },
      { title: 'Data Communications', author: 'Forouzan', isbn: '978-0-07-338314-9', subject: 'Networking', publisher: 'McGraw-Hill', totalCopies: 7 },
      { title: 'Compiler Design', author: 'Aho, Lam, Sethi', isbn: '978-0-13-468479-1', subject: 'Computer Science', publisher: 'Pearson', totalCopies: 3 },
      { title: 'Software Engineering', author: 'Ian Sommerville', isbn: '978-0-13-394303-0', subject: 'Software Eng.', publisher: 'Pearson', totalCopies: 6 },
      { title: 'Physics Vol.1', author: 'H.C. Verma', isbn: '978-8-17-722090-2', subject: 'Physics', publisher: 'Bharati', totalCopies: 15 }
    ];

    const books = [];
    for (const b of bookData) {
      books.push(await Book.create(b));
    }
    console.log(`📚 Created ${books.length} books`);

// --- SUPPLIERS ---------------------------------------
    const supplierData = [
      { name: 'Tata McGraw-Hill', contactPerson: 'Rajesh Sharma', phone: '011-41234567', email: 'orders@tmh.in', city: 'New Delhi', gstin: '07ABCDE1234F1Z5' },
      { name: 'Pearson India', contactPerson: 'Anita Verma', phone: '080-45678901', email: 'orders@pearson.in', city: 'Bengaluru', gstin: '29FGHIJ5678K2Z1' },
      { name: 'Wiley India', contactPerson: 'Suresh Patel', phone: '022-26789012', email: 'orders@wiley.in', city: 'Mumbai', gstin: '27KLMNO9012L3Z4' }
    ];

    const suppliers = [];
    for (const s of supplierData) {
      suppliers.push(await Supplier.create(s));
    }
    console.log(`🏭 Created ${suppliers.length} suppliers`);

// --- TRANSACTIONS (past overdue) ---------------------
    const librarian = members[0];
    const pastDate = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const txnData = [
      { type: 'issue', book: books[0]._id, member: members[1]._id, issuedBy: librarian._id, issueDate: pastDate(30), dueDate: pastDate(16), status: 'overdue' },
      { type: 'issue', book: books[3]._id, member: members[2]._id, issuedBy: librarian._id, issueDate: pastDate(25), dueDate: pastDate(11), status: 'overdue' },
      { type: 'issue', book: books[1]._id, member: members[3]._id, issuedBy: librarian._id, issueDate: pastDate(10), dueDate: pastDate(7), status: 'overdue' },
      { type: 'issue', book: books[8]._id, member: members[4]._id, issuedBy: librarian._id, issueDate: pastDate(5), dueDate: pastDate(-9), status: 'active' },
      { type: 'issue', book: books[2]._id, member: members[5]._id, issuedBy: librarian._id, issueDate: pastDate(20), dueDate: pastDate(6), status: 'overdue' },
      { type: 'issue', book: books[4]._id, member: members[5]._id, issuedBy: librarian._id, issueDate: pastDate(12), dueDate: pastDate(-2), status: 'active' },
      { type: 'issue', book: books[5]._id, member: members[5]._id, issuedBy: librarian._id, issueDate: pastDate(25), dueDate: pastDate(11), returnDate: pastDate(10), status: 'returned', finePaid: true }
    ];

    const txns = [];
    for (const t of txnData) {
      txns.push(await Transaction.create(t));
    }
    console.log(`🔄 Created ${txns.length} transactions`);

// --- FINES -------------------------------------------
    const fineData = [
      { transaction: txns[0]._id, member: members[1]._id, book: books[0]._id, daysOverdue: 16, ratePerDay: 10, totalAmount: 160, status: 'pending' },
      { transaction: txns[1]._id, member: members[2]._id, book: books[3]._id, daysOverdue: 11, ratePerDay: 10, totalAmount: 110, status: 'pending' },
      { transaction: txns[2]._id, member: members[3]._id, book: books[1]._id, daysOverdue: 7, ratePerDay: 10, totalAmount: 70, status: 'pending' },
      { transaction: txns[4]._id, member: members[5]._id, book: books[2]._id, daysOverdue: 6, ratePerDay: 10, totalAmount: 60, status: 'pending' },
      { transaction: txns[6]._id, member: members[5]._id, book: books[5]._id, daysOverdue: 1, ratePerDay: 10, totalAmount: 10, amountPaid: 10, paidDate: pastDate(10), status: 'paid', collectedBy: librarian._id }
    ];

    for (const f of fineData) {
      await Fine.create(f);
    }
    console.log(`💰 Created fines`);

  // --- PURCHASE ORDERS ---------------------------------
    const poData = [
      {
        supplier: suppliers[0]._id, orderedBy: librarian._id,
        items: [
          { title: 'Introduction to Algorithms', author: 'Cormen', isbn: '978-0-262-04630-5', quantity: 5, unitPrice: 1250 },
          { title: 'Discrete Mathematics', author: 'Rosen', isbn: '978-0-07-338309-5', quantity: 3, unitPrice: 980 }
        ],
        orderDate: pastDate(20), status: 'received', invoiceNumber: 'INV-2026-042'
      },
      {
        supplier: suppliers[1]._id, orderedBy: librarian._id,
        items: [
          { title: 'Computer Networks', author: 'Tanenbaum', isbn: '978-0-13-212695-3', quantity: 4, unitPrice: 1400 },
          { title: 'Software Engineering', author: 'Sommerville', isbn: '978-0-13-394303-0', quantity: 6, unitPrice: 1100 }
        ],
        orderDate: pastDate(10), status: 'in_transit'
      }
    ];

    for (const po of poData) {
      await PurchaseOrder.create(po);
    }
    console.log(`🛒 Created purchase orders`);

  console.log('✅ Database seeded successfully!\n');
  console.log('─────────────────────────────────────────');
  console.log('  Librarian Login:');
  console.log('  Email   : librarian@libranet.com');
  console.log('  Password: librarian123');
  console.log('─────────────────────────────────────────');
  console.log('  Student Login:');
  console.log('  Email   : neha@student.com');
  console.log('  Password: neha@123');
  console.log('─────────────────────────────────────────\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
