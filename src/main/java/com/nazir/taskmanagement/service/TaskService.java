package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.TaskRequest;
import com.nazir.taskmanagement.dto.request.TaskStatusRequest;
import com.nazir.taskmanagement.dto.response.*;
import com.nazir.taskmanagement.entity.*;
import com.nazir.taskmanagement.entity.enums.*;
import com.nazir.taskmanagement.exception.*;
import com.nazir.taskmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskActivityRepository activityRepository;
    private final ProjectService projectService;
    private final UserService userService;

    @Transactional
    public TaskResponse createTask(Long projectId, TaskRequest request, User currentUser) {
        Project project = projectService.findProjectById(projectId);
        validateProjectAccess(project, currentUser);

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userService.getUserById(request.getAssigneeId());
            validateProjectAccess(project, assignee);
        }

        int counter = project.incrementTaskCounter();

        Task task = Task.builder()
            .taskNumber(project.getKey() + "-" + counter)
            .title(request.getTitle())
            .description(request.getDescription())
            .status(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO)
            .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
            .type(request.getType() != null ? request.getType() : TaskType.TASK)
            .project(project)
            .assignee(assignee)
            .reporter(currentUser)
            .dueDate(request.getDueDate())
            .estimatedHours(request.getEstimatedHours())
            .loggedHours(0)
            .build();

        task = taskRepository.save(task);
        logActivity(task, currentUser, "CREATED", null, null, null);

        log.info("Task created: {} by {}", task.getTaskNumber(), currentUser.getUsername());
        return TaskResponse.from(task);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, User currentUser) {
        Task task = findTaskById(taskId);
        validateProjectAccess(task.getProject(), currentUser);
        return TaskResponse.from(task);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasksByProject(Long projectId, TaskStatus status, Priority priority,
                                                 TaskType type, Long assigneeId,
                                                 int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sort));
        return taskRepository.findByProjectWithFilters(projectId, status, priority, type, assigneeId, pageable)
            .map(TaskResponse::from);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksBoardByProject(Long projectId, User currentUser) {
        Project project = projectService.findProjectById(projectId);
        validateProjectAccess(project, currentUser);
        return taskRepository.findByProjectId(projectId).stream()
            .map(TaskResponse::from)
            .toList();
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, TaskRequest request, User currentUser) {
        Task task = findTaskById(taskId);
        validateProjectAccess(task.getProject(), currentUser);

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());

        if (request.getStatus() != null && !request.getStatus().equals(task.getStatus())) {
            logActivity(task, currentUser, "STATUS_CHANGED", "status",
                task.getStatus().name(), request.getStatus().name());
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null && !request.getPriority().equals(task.getPriority())) {
            logActivity(task, currentUser, "PRIORITY_CHANGED", "priority",
                task.getPriority().name(), request.getPriority().name());
            task.setPriority(request.getPriority());
        }
        if (request.getType() != null) task.setType(request.getType());

        if (request.getAssigneeId() != null) {
            User newAssignee = userService.getUserById(request.getAssigneeId());
            String oldAssignee = task.getAssignee() != null ? task.getAssignee().getUsername() : "unassigned";
            logActivity(task, currentUser, "ASSIGNEE_CHANGED", "assignee",
                oldAssignee, newAssignee.getUsername());
            task.setAssignee(newAssignee);
        }

        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
        if (request.getLoggedHours() != null) task.setLoggedHours(request.getLoggedHours());

        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateTaskStatus(Long taskId, TaskStatusRequest request, User currentUser) {
        Task task = findTaskById(taskId);
        validateProjectAccess(task.getProject(), currentUser);

        if (!request.getStatus().equals(task.getStatus())) {
            logActivity(task, currentUser, "STATUS_CHANGED", "status",
                task.getStatus().name(), request.getStatus().name());
            task.setStatus(request.getStatus());
        }

        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse assignTask(Long taskId, Long assigneeId, User currentUser) {
        Task task = findTaskById(taskId);
        validateProjectAccess(task.getProject(), currentUser);

        User assignee = userService.getUserById(assigneeId);
        validateProjectAccess(task.getProject(), assignee);

        String oldAssignee = task.getAssignee() != null ? task.getAssignee().getUsername() : "unassigned";
        logActivity(task, currentUser, "ASSIGNEE_CHANGED", "assignee", oldAssignee, assignee.getUsername());

        task.setAssignee(assignee);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long taskId, User currentUser) {
        Task task = findTaskById(taskId);
        validateOwnerOrReporter(task, currentUser);
        taskRepository.delete(task);
        log.info("Task deleted: {} by {}", task.getTaskNumber(), currentUser.getUsername());
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getMyTasks(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "dueDate"));
        return taskRepository.findByAssignee(currentUser, pageable).map(TaskResponse::from);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getTaskActivities(Long taskId, User currentUser) {
        Task task = findTaskById(taskId);
        validateProjectAccess(task.getProject(), currentUser);
        return activityRepository.findByTaskIdOrderByCreatedAtDesc(taskId).stream()
            .map(ActivityResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(User currentUser) {
        List<Task> myTasks = taskRepository.findActiveTasksByAssignee(currentUser);
        List<Task> recentTasks = taskRepository.findRecentTasksForUser(currentUser,
            PageRequest.of(0, 5));
        List<Task> upcomingDue = taskRepository.findUpcomingDueTasks(
            LocalDate.now(), LocalDate.now().plusDays(7));
        List<Task> overdueTasks = taskRepository.findOverdueTasks(LocalDate.now());

        long completedTasks = taskRepository.countByAssigneeAndStatus(currentUser, TaskStatus.DONE);
        long inProgress = taskRepository.countByAssigneeAndStatus(currentUser, TaskStatus.IN_PROGRESS);

        Map<String, Long> tasksByStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            tasksByStatus.put(status.name(), taskRepository.countByAssigneeAndStatus(currentUser, status));
        }

        return DashboardResponse.builder()
            .myTasks((long) myTasks.size())
            .completedTasks(completedTasks)
            .overdueTasks((long) overdueTasks.size())
            .inProgressTasks(inProgress)
            .tasksByStatus(tasksByStatus)
            .recentTasks(recentTasks.stream().map(TaskResponse::from).toList())
            .upcomingDueTasks(upcomingDue.stream().map(TaskResponse::from).toList())
            .build();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> searchTasks(String query, User currentUser) {
        Pageable pageable = PageRequest.of(0, 20);
        return taskRepository.searchTasks(query, pageable).stream()
            .filter(t -> t.getProject().isOwner(currentUser) || t.getProject().isMember(currentUser))
            .map(TaskResponse::from)
            .toList();
    }

    public Task findTaskById(Long id) {
        return taskRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }

    private void logActivity(Task task, User user, String action, String field, String oldVal, String newVal) {
        activityRepository.save(TaskActivity.builder()
            .task(task)
            .user(user)
            .action(action)
            .fieldName(field)
            .oldValue(oldVal)
            .newValue(newVal)
            .build());
    }

    private void validateProjectAccess(Project project, User user) {
        if (!project.isOwner(user) && !project.isMember(user)) {
            throw new UnauthorizedException("You don't have access to this project");
        }
    }

    private void validateOwnerOrReporter(Task task, User user) {
        boolean isProjectOwner = task.getProject().isOwner(user);
        boolean isReporter = task.getReporter().getId().equals(user.getId());
        boolean isAdmin = user.getRole().name().equals("ROLE_ADMIN");
        if (!isProjectOwner && !isReporter && !isAdmin) {
            throw new UnauthorizedException("You don't have permission to delete this task");
        }
    }
}
