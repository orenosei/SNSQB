import { useState } from "react";
import { Link, useParams } from "react-router";
import { Plus, School, UserPlus, ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Loading, ListSkeleton, ErrorNotice } from "../../components/Feedback";
import { EmptyState, QueryError } from "../../components/SocialFeedback";
import { formatTime, routeId, validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { useAssignedClasses, useClassDetail, useRoster } from "./api";
import { CreateClassDialog, EnrollDialog } from "./ClassDialogs";

export function ClassesPage() {
  const query = useAssignedClasses();
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const classes = (query.data || []).filter((item) =>
    [
      item.class_code,
      item.subject_code,
      item.subject_name,
      item.semester_name,
    ].some((value) =>
      value
        ?.toLocaleLowerCase("vi")
        .includes(filter.trim().toLocaleLowerCase("vi")),
    ),
  );
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="KHÔNG GIAN GIẢNG DẠY"
        title="Lớp học phần"
        description="Quản lý lớp phụ trách và những kết nối học tập."
        actions={
          <button
            className="button button-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
            Tạo lớp học phần
          </button>
        }
      />
      <div className="surface list-toolbar">
        <label className="field">
          Tìm trong danh sách lớp
          <input
            type="search"
            placeholder="Mã lớp, môn học hoặc học kỳ…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <span className="muted">
          {query.data ? `${classes.length} lớp hiển thị` : "Đang cập nhật"}
        </span>
      </div>
      {query.isPending ? (
        <ListSkeleton label="Đang tải lớp học phần…" />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : !classes.length ? (
        <EmptyState
          title={filter ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp học phần"}
          description={
            filter
              ? "Thử từ khóa khác hoặc xóa bộ lọc."
              : "Tạo lớp học phần để bắt đầu ghi danh sinh viên."
          }
          action={
            filter ? (
              <button
                className="button button-secondary"
                onClick={() => setFilter("")}
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                className="button button-primary"
                onClick={() => setCreating(true)}
              >
                Tạo lớp học phần
              </button>
            )
          }
        />
      ) : (
        <div className="surface data-list">
          <table className="workspace-table">
            <caption className="sr-only">Lớp học phần do bạn phụ trách</caption>
            <thead>
              <tr>
                <th>Lớp / Môn học</th>
                <th>Học kỳ</th>
                <th>Sinh viên</th>
                <th>
                  <span className="sr-only">Chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item, i) => (
                <tr key={item.course_class_id || i}>
                  <td data-label="Lớp / Môn">
                    <div className="table-identity">
                      <School size={21} />
                      <div>
                        <strong>
                          {validId(item.course_class_id) ? (
                            <Link
                              to={`/lecturer/course-classes/${item.course_class_id}`}
                            >
                              {item.class_code ||
                                `Lớp #${item.course_class_id}`}
                            </Link>
                          ) : (
                            item.class_code
                          )}
                        </strong>
                        <small>
                          {item.subject_code} · {item.subject_name}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td data-label="Học kỳ">{item.semester_name || "—"}</td>
                  <td data-label="Sinh viên">{item.total_students ?? "—"}</td>
                  <td>
                    {validId(item.course_class_id) && (
                      <Link
                        className="text-button"
                        to={`/lecturer/course-classes/${item.course_class_id}`}
                        aria-label={`Mở lớp ${item.class_code || item.course_class_id}`}
                      >
                        <ArrowUpRight size={20} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateClassDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

export function ClassDetailPage() {
  const { courseClassId } = useParams();
  const id = routeId(courseClassId);
  return id ? (
    <ClassDetail key={id} id={id} />
  ) : (
    <ErrorNotice message="Mã lớp học phần không hợp lệ." />
  );
}
function ClassDetail({ id }: { id: number }) {
  const query = useClassDetail(id);
  const me = useProfile();
  const owned =
    validId(query.data?.lecturer_id) &&
    query.data.lecturer_id === me.data?.user_id;
  const roster = useRoster(id, owned);
  const [filter, setFilter] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const students = (roster.data || []).filter((student) =>
    [student.student_code, student.full_name, student.email].some((value) =>
      value
        ?.toLocaleLowerCase("vi")
        .includes(filter.trim().toLocaleLowerCase("vi")),
    ),
  );
  return (
    <div className="workspace-page">
      <Link className="back-link" to="/lecturer/course-classes">
        <ArrowLeft size={17} />
        Lớp học phần
      </Link>
      {query.isPending ? (
        <Loading label="Đang tải thông tin lớp…" />
      ) : query.isError || !query.data ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <PageHeader
            eyebrow={query.data.subject_code || "LỚP HỌC PHẦN"}
            title={query.data.class_code || `Lớp #${id}`}
            description={`${query.data.subject_name || "Môn học"} · Học kỳ ${query.data.semester_name || "—"}`}
            actions={
              owned && (
                <button
                  className="button button-primary"
                  onClick={() => setEnrolling(true)}
                >
                  <UserPlus size={18} />
                  Thêm sinh viên
                </button>
              )
            }
          />
          <div className="surface class-overview">
            <div>
              <span className="muted">Giảng viên phụ trách</span>
              <strong>{query.data.lecturer_name || "—"}</strong>
            </div>
            <div>
              <span className="muted">Đã ghi danh</span>
              <strong>{query.data.total_students ?? "—"} sinh viên</strong>
            </div>
            <Link to="/lecturer/exams/new" className="button button-secondary">
              Tạo đề thi
            </Link>
          </div>
          {!owned ? (
            <p className="notice">
              Chỉ giảng viên phụ trách mới có thể quản lý danh sách sinh viên
              tại đây.
            </p>
          ) : (
            <>
              <div className="list-toolbar">
                <h2>Danh sách sinh viên</h2>
                <label className="field">
                  <span className="sr-only">Tìm sinh viên trong lớp</span>
                  <input
                    aria-label="Tìm sinh viên trong lớp"
                    type="search"
                    placeholder="MSSV, họ tên hoặc email…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
              </div>
              {roster.isPending ? (
              <ListSkeleton label="Đang tải danh sách sinh viên…" />
              ) : roster.isError ? (
                <QueryError
                  error={roster.error}
                  retry={() => void roster.refetch()}
                />
              ) : !students.length ? (
                <EmptyState
                  title={
                    filter
                      ? "Không có sinh viên phù hợp"
                      : "Lớp chưa có sinh viên"
                  }
                  description={
                    filter
                      ? "Thử từ khóa khác."
                      : "Thêm sinh viên bằng danh sách mã số sinh viên."
                  }
                />
              ) : (
                <div className="surface data-list">
                  <table className="workspace-table">
                    <caption className="sr-only">
                      Danh sách sinh viên lớp {query.data.class_code}
                    </caption>
                    <thead>
                      <tr>
                        <th>Sinh viên</th>
                        <th>Email / Lớp sinh hoạt</th>
                        <th>Ghi danh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => (
                        <tr key={student.user_id || i}>
                          <td data-label="Sinh viên">
                            <strong>
                              {validId(student.user_id) ? (
                                <Link to={`/users/${student.user_id}`}>
                                  {student.full_name || "Sinh viên"}
                                </Link>
                              ) : (
                                student.full_name
                              )}
                            </strong>
                            <small>{student.student_code || "—"}</small>
                          </td>
                          <td data-label="Email / Lớp">
                            {student.email || "—"}
                            <small>{student.class_name}</small>
                          </td>
                          <td data-label="Ghi danh">
                            {formatTime(student.enrolled_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
      {enrolling && owned && (
        <EnrollDialog classId={id} onClose={() => setEnrolling(false)} />
      )}
    </div>
  );
}
