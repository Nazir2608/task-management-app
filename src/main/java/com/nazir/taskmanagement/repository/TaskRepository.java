package com.nazir.taskmanagement.repository;

import com.nazir.taskmanagement.entity.Task;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.Priority;
import com.nazir.taskmanagement.entity.enums.TaskStatus;
import com.nazir.taskmanagement.entity.enums.TaskType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    Page<Task> findByProjectId(Long projectId, Pageable pageable);

    List<Task> findByProjectId(Long projectId);

    Page<Task> findByAssignee(User assignee, Pageable pageable);

    List<Task> findByAssignee(User assignee);

    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);

    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND (:type IS NULL OR t.type = :type) " +
           "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)")
    Page<Task> findByProjectWithFilters(Long projectId, TaskStatus status,
                                        Priority priority, TaskType type,
                                        Long assigneeId, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.assignee = :user AND t.status NOT IN ('DONE', 'CANCELLED') " +
           "ORDER BY t.dueDate ASC NULLS LAST, t.priority DESC")
    List<Task> findActiveTasksByAssignee(User user);

    @Query("SELECT t FROM Task t WHERE t.dueDate < :date AND t.status NOT IN ('DONE', 'CANCELLED')")
    List<Task> findOverdueTasks(LocalDate date);

    @Query("SELECT t FROM Task t WHERE t.dueDate BETWEEN :from AND :to AND t.status NOT IN ('DONE', 'CANCELLED') " +
           "ORDER BY t.dueDate ASC")
    List<Task> findUpcomingDueTasks(LocalDate from, LocalDate to);

    long countByAssigneeAndStatus(User assignee, TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.id = :projectId AND t.status = :status")
    long countByProjectIdAndStatus(Long projectId, TaskStatus status);

    @Query("SELECT t.status, COUNT(t) FROM Task t WHERE t.project.id = :projectId GROUP BY t.status")
    List<Object[]> countByProjectGroupedByStatus(Long projectId);

    @Query("SELECT t FROM Task t WHERE t.project.id IN " +
           "(SELECT p.id FROM Project p WHERE p.owner = :user OR :user MEMBER OF p.members) " +
           "ORDER BY t.createdAt DESC")
    List<Task> findRecentTasksForUser(User user, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE " +
           "LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.taskNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Task> searchTasks(String query, Pageable pageable);
}
