package com.nazir.taskmanagement.dto.response;

import com.nazir.taskmanagement.entity.Comment;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CommentResponse {
    private Long id;
    private String content;
    private Long taskId;
    private UserResponse author;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
            .id(comment.getId())
            .content(comment.getContent())
            .taskId(comment.getTask().getId())
            .author(UserResponse.from(comment.getAuthor()))
            .createdAt(comment.getCreatedAt())
            .updatedAt(comment.getUpdatedAt())
            .build();
    }
}
