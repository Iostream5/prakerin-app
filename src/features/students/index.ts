export type {
  Student,
  ListStudentsParams,
  CreateStudentInput,
  UpdateStudentInput,
  StudentsActionResult,
} from "@/src/features/students/types";

export {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "@/src/features/students/server-actions/students";
