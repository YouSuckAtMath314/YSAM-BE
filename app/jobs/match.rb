class Match
  @queue = :user

  def self.perform(id)
    puts "Matching #{id}!"
  end
end
