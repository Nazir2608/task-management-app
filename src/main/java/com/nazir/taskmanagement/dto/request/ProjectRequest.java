package com.nazir.taskmanagement.dto.request;

import com.nazir.taskmanagement.entity.enums.ProjectStatus;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(min = 2, max = 100, message = "Project name must be between 2 and 100 characters")
    private String name;

    @Size(max = 1000)
    private String description;

    @Size(max = 2000)
    private String key;

    private ProjectStatus status;
}
