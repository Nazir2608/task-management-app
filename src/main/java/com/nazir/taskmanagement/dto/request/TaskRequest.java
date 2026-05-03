package com.nazir.taskmanagement.dto.request;

import com.nazir.taskmanagement.entity.enums.Priority;
import com.nazir.taskmanagement.entity.enums.TaskStatus;
import com.nazir.taskmanagement.entity.enums.TaskType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequest {

    @NotBlank(message = "Task title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 5000)
    private String description;

    private TaskStatus status;

    private Priority priority;

    private TaskType type;

    private Long assigneeId;

    private LocalDate dueDate;

    @Min(value = 0, message = "Estimated hours must be non-negative")
    @Max(value = 1000, message = "Estimated hours cannot exceed 1000")
    private Integer estimatedHours;

    @Min(value = 0)
    private Integer loggedHours;
}
