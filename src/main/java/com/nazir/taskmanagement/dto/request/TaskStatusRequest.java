package com.nazir.taskmanagement.dto.request;

import com.nazir.taskmanagement.entity.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskStatusRequest {
    @NotNull(message = "Status is required")
    private TaskStatus status;
}
