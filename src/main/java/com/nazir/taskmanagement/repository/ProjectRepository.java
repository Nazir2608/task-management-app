package com.nazir.taskmanagement.repository;

import com.nazir.taskmanagement.entity.Project;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByOwner(User owner);

    @Query("SELECT p FROM Project p WHERE p.owner = :user OR :user MEMBER OF p.members ORDER BY p.createdAt DESC")
    List<Project> findByOwnerOrMember(User user);

    @Query("SELECT p FROM Project p WHERE p.owner = :user OR :user MEMBER OF p.members AND p.status = :status")
    List<Project> findByOwnerOrMemberAndStatus(User user, ProjectStatus status);

    boolean existsByKey(String key);

    Optional<Project> findByKey(String key);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.id = :projectId")
    long countTasksByProjectId(Long projectId);
}
