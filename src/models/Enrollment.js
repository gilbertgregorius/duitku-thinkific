// Minimal Enrollment model (stub)
class Enrollment {
  constructor(userId, courseId, status = 'pending') {
    this.userId = userId;
    this.courseId = courseId;
    this.status = status;
    this.createdAt = new Date();
  }
}

module.exports = Enrollment;
