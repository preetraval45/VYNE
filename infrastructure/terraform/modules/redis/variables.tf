variable "environment" { type = string }
variable "isolated_subnet_ids" { type = list(string) }
variable "sg_redis_id" { type = string }
variable "node_type" {
  type    = string
  default = "cache.t4g.micro"
}
