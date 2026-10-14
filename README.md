# Exam Hall Allocation System

A comprehensive web-based system for automatically allocating students to exam halls and generating reports. Built with HTML, CSS, JavaScript, and MySQL.

## Features

### Admin Panel
- **Hall Management**: Add exam halls with capacity specifications
- **Department Management**: Add departments with student counts
- **Automatic Allocation**: One-click allocation algorithm that:
  - Mixes departments across halls for optimal space utilization
  - Assigns seat numbers automatically
  - Ensures no hall exceeds capacity
  - Generates roll numbers automatically

### Student Panel
- **Hall Lookup**: Students can find their exam hall and seat by entering roll number
- **Real-time Search**: Instant results with detailed allocation information

### Reports
- **Hall-wise Reports**: Complete list of students in each hall with seat numbers
- **Department-wise Reports**: Students grouped by department showing their hall allocations
- **Attendance Sheets**: Printable attendance registers with signature fields
- **Hall Tickets**: Individual hall tickets for each student

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: PHP (for database integration)
- **Database**: MySQL
- **Styling**: Custom CSS with responsive design
- **Icons**: Font Awesome

## Installation

### Prerequisites
- Web server (Apache/Nginx)
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Modern web browser

### Setup Instructions

1. **Database Setup**
   ```bash
   # Import the database schema
   mysql -u username -p exam_allocation_system < database.sql
   ```

2. **File Placement**
   - Place all files in your web server's document root
   - Ensure the database connection details are configured

3. **Configuration**
   - Update database connection settings in the backend files
   - Set appropriate file permissions

## Usage

### For Administrators

1. **Add Halls**
   - Navigate to Admin Panel → Halls Setup
   - Enter hall name and capacity
   - Click "Add Hall"

2. **Add Departments**
   - Navigate to Admin Panel → Departments Setup
   - Enter department name and student count
   - Click "Add Department"

3. **Run Allocation**
   - Navigate to Admin Panel → Run Allocation
   - Click "Run Allocation" to automatically assign students
   - System will mix departments and optimize hall usage

4. **Generate Reports**
   - Navigate to Reports section
   - Choose the desired report type
   - Print or save the generated reports

### For Students

1. **Find Allocation**
   - Navigate to Student Panel
   - Enter your roll number
   - View your hall and seat assignment

## Algorithm Details

### Allocation Process
1. **Student Generation**: Creates student records for each department
2. **Shuffling**: Randomly shuffles students to mix departments
3. **Hall Assignment**: Sequentially fills halls based on capacity
4. **Seat Assignment**: Assigns consecutive seat numbers within each hall
5. **Optimization**: Ensures maximum space utilization

### Key Features
- **Department Mixing**: Prevents department clustering
- **Capacity Optimization**: Fills halls efficiently
- **Automatic Roll Numbers**: Generates unique roll numbers
- **Error Handling**: Validates capacity constraints

## Database Schema

### Tables
- `halls`: Stores hall information and capacity
- `departments`: Stores department details and student counts
- `students`: Stores student records and allocation data
- `allocation_sessions`: Tracks allocation sessions

### Views
- `hall_allocation_view`: Hall-wise allocation statistics
- `department_allocation_view`: Department-wise allocation summary
- `student_allocation_view`: Complete student allocation details

## File Structure

```
exam-hall-allocation/
├── index.html          # Main application interface
├── styles.css          # Responsive styling
├── script.js           # Frontend JavaScript logic
├── database.sql        # MySQL database schema
├── README.md           # This documentation
└── config.php          # Database configuration (to be created)
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Features

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Secure session management

## Performance Optimization

- Efficient database queries with proper indexing
- Optimized allocation algorithm
- Responsive design for mobile compatibility
- Local storage for data persistence

## Future Enhancements

- Multi-exam session support
- Advanced reporting with charts
- Email notifications for students
- Mobile app companion
- Integration with college ERP systems

## Support

For technical support or questions:
- Check the documentation
- Review the database schema
- Test with sample data

## License

This project is open-source and available under the MIT License.

---

**Note**: This system is designed for educational institutions and can be customized based on specific requirements. The allocation algorithm ensures fair distribution and optimal utilization of available resources.
