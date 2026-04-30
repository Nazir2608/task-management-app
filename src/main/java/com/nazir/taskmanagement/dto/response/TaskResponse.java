package com.nazir.taskmanagement.dto.response;

import com.nazir.taskmanagement.entity.Task;
import com.nazir.taskmanagement.entity.enums.Priority;
import com.nazir.taskmanagement.entity.enums.TaskStatus;
import com.nazir.taskmanagement.entity.enums.TaskType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TaskResponse {
    private Long id;
    private String taskNumber;
    private String title;
    private String description;
    private TaskStatus status;
    private Priority priority;
    private TaskType type;
    private Long projectId;
    private String projectName;
    private String projectKey;
    private UserResponse assignee;
    private UserResponse reporter;
    private LocalDate dueDate;
    private Integer estimatedHours;
    private Integer loggedHours;
    private boolean overdue;
    private int commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TaskResponse from(Task task) {
        return TaskResponse.builder()
            .id(task.getId())
            .taskNumber(task.getTaskNumber())
            .title(task.getTitle())
            .description(task.getDescription())
            .status(task.getStatus())
            .priority(task.getPriority())
            .type(task.getType())
            .projectId(task.getProject().getId())
            .projectName(task.getProject().getName())
            .projectKey(task.getProject().getKey())
            .assignee(task.getAssignee() != null ? UserResponse.from(task.getAssignee()) : null)
            .reporter(UserResponse.from(task.getReporter()))
            .dueDate(task.getDueDate())
            .estimatedHours(task.getEstimatedHours())
            .loggedHours(task.getLoggedHours())
            .overdue(task.isOverdue())
            .commentCount(task.getComments().size())
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();
    }
}
