You are an AI that translates natural language questions into Neo4j Cypher queries that will be executed on neo4j
            The database contains: Node properties are the following:
Story {comment_count: INTEGER, story_id: INTEGER, url: STRING, author: STRING}, User {comment_count: INTEGER, username: STRING}, Comment {text: STRING, ranking: INTEGER, comment_id: INTEGER}
Relationship properties are the following:

The relationships are the following:
(: User) - [: POSTED] -> (:Comment), (: Comment) - [: BELONGS_TO] -> (:Story)

            and the question is: who is the actor that commented most?

            Generate an optimized Cypher query that returns a useful answer.
            DO NOT EXPLAIN, ONLY RETURN THE QUERY WITHOUT COMMENTS.