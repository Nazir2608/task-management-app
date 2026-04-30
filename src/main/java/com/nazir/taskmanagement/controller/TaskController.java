package com.nazir.taskmanagement.controller;

import com.nazir.taskmanagement.dto.request.TaskRequest;
import com.nazir.taskmanagement.dto.request.TaskStatusRequest;
import com.nazir.taskmanagement.dto.response.*;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.Priority;
import com.nazir.taskmanagement.entity.enums.TaskStatus;
import com.nazir.taskmanagement.entity.enums.TaskType;
import com.nazir.taskmanagement.service.TaskService;
import com.nazir.taskmanagement.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Tasks", description = "Create, update, assign and track tasks")
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;

    // ─── Task CRUD ───────────────────────────────────────────────────────────

    @PostMapping("/projects/{projectId}/tasks")
    @Operation(summary = "Create a task inside a project")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(@PathVariable Long projectId, @AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody TaskRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        TaskResponse task = taskService.createTask(projectId, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Task created", task));
    }

    @GetMapping("/projects/{projectId}/tasks")
    @Operation(summary = "Get paginated/filtered tasks for a project")
    public ResponseEntity<ApiResponse<Page<TaskResponse>>> getProjectTasks(
            @PathVariable Long projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) TaskType type,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort) {
        Page<TaskResponse> tasks = taskService.getTasksByProject(
                projectId, status, priority, type, assigneeId, page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @GetMapping("/projects/{projectId}/tasks/board")
    @Operation(summary = "Get all tasks for Kanban board view (ungrouped)")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getBoardTasks(@PathVariable Long projectId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.getTasksBoardByProject(projectId, user)));
    }

    @GetMapping("/tasks/{taskId}")
    @Operation(summary = "Get a single task by ID")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.getTaskById(taskId, user)));
    }

    @PutMapping("/tasks/{taskId}")
    @Operation(summary = "Update a task (full update)")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody TaskRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Task updated", taskService.updateTask(taskId, request, user)));
    }

    @PatchMapping("/tasks/{taskId}/status")
    @Operation(summary = "Update task status only (used by Kanban drag-and-drop)")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody TaskStatusRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Status updated",
                taskService.updateTaskStatus(taskId, request, user)));
    }

    @PatchMapping("/tasks/{taskId}/assign/{assigneeId}")
    @Operation(summary = "Assign a task to a project member")
    public ResponseEntity<ApiResponse<TaskResponse>> assignTask(@PathVariable Long taskId, @PathVariable Long assigneeId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Task assigned", taskService.assignTask(taskId, assigneeId, user)));
    }

    @DeleteMapping("/tasks/{taskId}")
    @Operation(summary = "Delete a task")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        taskService.deleteTask(taskId, user);
        return ResponseEntity.ok(ApiResponse.success("Task deleted", null));
    }

    // ─── Activities ──────────────────────────────────────────────────────────

    @GetMapping("/tasks/{taskId}/activities")
    @Operation(summary = "Get activity/change log for a task")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getTaskActivities(@PathVariable Long taskId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.getTaskActivities(taskId, user)));
    }

    // ─── Dashboard & Search ──────────────────────────────────────────────────

    @GetMapping("/tasks/my")
    @Operation(summary = "Get tasks assigned to me (paginated)")
    public ResponseEntity<ApiResponse<Page<TaskResponse>>> getMyTasks(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.getMyTasks(user, page, size)));
    }

    @GetMapping("/tasks/dashboard")
    @Operation(summary = "Get dashboard statistics for the current user")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.getDashboard(user)));
    }

    @GetMapping("/tasks/search")
    @Operation(summary = "Full-text search across task titles, descriptions and task numbers")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> searchTasks(@RequestParam String q, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(taskService.searchTasks(q, user)));
    }
}
