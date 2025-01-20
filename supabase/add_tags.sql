-- Create a new table for tags
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- Create a join table for the many-to-many relationship between tickets and tags
CREATE TABLE ticket_tags (
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, tag_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX idx_ticket_tags_tag_id ON ticket_tags(tag_id); 